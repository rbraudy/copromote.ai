import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Loader2, ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react';

interface BundleSuggestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    leadId: string;
    sellerId: string;
    partnerName: string;
}

interface BundleSuggestion {
    seller_product_id: string;
    customer_product_id: string;
    seller_product_name?: string;
    seller_product_image?: string;
    seller_product_price?: number;
    partner_product_name?: string;
    partner_product_image?: string;
    partner_product_price?: number;
    bundle_title: string;
    bundle_description: string;
    discount_percentage: number;
    minimum_order_quantity: number;
    complementary_reasoning: string;
    vignette_urls?: string[]; // Array for multiple vignettes
    duration_days?: number;
}

export const BundleSuggestionsModal = ({ isOpen, onClose, leadId, sellerId, partnerName }: BundleSuggestionsModalProps) => {
    const [suggestions, setSuggestions] = useState<BundleSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentImageIndices, setCurrentImageIndices] = useState<{ [key: number]: number }>({});
    const [creating, setCreating] = useState<number | null>(null);
    const [generatingVignettes, setGeneratingVignettes] = useState<{ [key: number]: boolean }>({});
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [batchCreating, setBatchCreating] = useState(false);

    useEffect(() => {
        if (isOpen && leadId && sellerId) {
            fetchSuggestions();
        }
    }, [isOpen, leadId, sellerId]);

    const fetchSuggestions = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.functions.invoke('suggestBundles', {
                body: { leadId, sellerId }
            });

            if (error) throw error;
            const newSuggestions = data.suggestions || [];
            setSuggestions(newSuggestions);

            // Start sequential generation (Combined First)
            generateAllVignettesSequentially(newSuggestions);

        } catch (err: any) {
            console.error('Error fetching bundles:', err);
            setError(err.message || 'Failed to generate bundles');
        } finally {
            setLoading(false);
        }
    };

    const generateAllVignettesSequentially = async (bundles: BundleSuggestion[]) => {
        // Pass 1: Combined 1 for ALL bundles (Priority - The "Hero" Image)
        for (let i = 0; i < bundles.length; i++) {
            await generateOneVignette(i, bundles[i], 'combined', 'modern kitchen');
            await new Promise(r => setTimeout(r, 2000)); // 2s delay
        }

        // Pass 2: Combined 2 for ALL bundles (The "Carousel" Image)
        for (let i = 0; i < bundles.length; i++) {
            await generateOneVignette(i, bundles[i], 'combined', 'lifestyle table setting');
            await new Promise(r => setTimeout(r, 2000));
        }
    };

    const generateOneVignette = async (index: number, bundle: BundleSuggestion, type: string, setting: string) => {
        setGeneratingVignettes(prev => ({ ...prev, [index]: true }));
        try {
            const { data, error } = await supabase.functions.invoke('generateVignetteGemini', {
                body: { bundle, setting, type }
            });

            if (error) throw error;

            if (data?.imageUrl) {
                setSuggestions(prev => {
                    const newSuggestions = [...prev];
                    if (newSuggestions[index]) {
                        const currentUrls = newSuggestions[index].vignette_urls || [];
                        // Avoid duplicates
                        if (!currentUrls.includes(data.imageUrl)) {
                            newSuggestions[index] = {
                                ...newSuggestions[index],
                                vignette_urls: [...currentUrls, data.imageUrl]
                            };
                        }
                    }
                    return newSuggestions;
                });

                // Preload
                const img = new Image();
                img.src = data.imageUrl;
            }
        } catch (e) {
            console.error(`Failed to generate ${type} vignette for bundle ${index}:`, e);
        } finally {
            setGeneratingVignettes(prev => ({ ...prev, [index]: false }));
        }
    };

    const handleUpdateBundle = (index: number, field: keyof BundleSuggestion, value: any) => {
        setSuggestions(prev => {
            const newSuggestions = [...prev];
            newSuggestions[index] = { ...newSuggestions[index], [field]: value };
            return newSuggestions;
        });
    };

    const handleNextImage = (index: number, totalImages: number) => {
        if (totalImages === 0) return;
        setCurrentImageIndices(prev => ({
            ...prev,
            [index]: ((prev[index] || 0) + 1) % totalImages
        }));
    };

    const handlePrevImage = (index: number, totalImages: number) => {
        if (totalImages === 0) return;
        setCurrentImageIndices(prev => ({
            ...prev,
            [index]: ((prev[index] || 0) - 1 + totalImages) % totalImages
        }));
    };



    const toggleSelection = (index: number) => {
        setSelectedIndices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const updateProductPrice = async (productId: string, price: number) => {
        if (!productId || !price) return;
        const { error } = await supabase
            .from('products')
            .update({ price: price })
            .eq('id', productId);

        if (error) {
            console.error('Error updating product price:', error);
        }
    };

    const handleCreateBatch = async () => {
        if (selectedIndices.size === 0) return;
        setBatchCreating(true);
        try {
            const promises = Array.from(selectedIndices).map(async index => {
                const bundle = suggestions[index];

                // Update product price if changed
                if (bundle.seller_product_price) {
                    await updateProductPrice(bundle.seller_product_id, bundle.seller_product_price);
                }

                return supabase.from('copromotions').insert({
                    seller_id: sellerId,
                    lead_id: leadId,
                    seller_product_id: bundle.seller_product_id,
                    external_product_id: bundle.customer_product_id,
                    status: 'draft',
                    offer_details: {
                        discount: bundle.discount_percentage,
                        moq: bundle.minimum_order_quantity,
                        duration: bundle.duration_days,
                        title: bundle.bundle_title,
                        description: bundle.bundle_description,
                        original_price: (bundle.seller_product_price || 0),
                        promotion_price: ((bundle.seller_product_price || 0) * (1 - (bundle.discount_percentage || 0) / 100)),
                        partner_product_name: bundle.partner_product_name,
                        partner_product_image: bundle.partner_product_image,
                        partner_product_price: bundle.partner_product_price,
                        seller_product_name: bundle.seller_product_name,
                        seller_product_image: bundle.seller_product_image
                    },
                    marketing_assets: {
                        vignettes: bundle.vignette_urls
                    }
                });
            });

            await Promise.all(promises);
            alert(`${selectedIndices.size} promotions created successfully!`);
            onClose();
        } catch (err: any) {
            console.error('Error creating promotions:', err);
            alert('Failed to create promotions: ' + err.message);
        } finally {
            setBatchCreating(false);
        }
    };

    const handleCreatePromotion = async (index: number, bundle: BundleSuggestion) => {
        setCreating(index);
        try {
            // Update product price if changed
            if (bundle.seller_product_price) {
                await updateProductPrice(bundle.seller_product_id, bundle.seller_product_price);
            }

            const { error } = await supabase.from('copromotions').insert({
                seller_id: sellerId,
                lead_id: leadId,
                seller_product_id: bundle.seller_product_id,
                external_product_id: bundle.customer_product_id,
                status: 'draft',
                offer_details: {
                    discount: bundle.discount_percentage,
                    moq: bundle.minimum_order_quantity,
                    duration: bundle.duration_days,
                    title: bundle.bundle_title,
                    description: bundle.bundle_description,
                    original_price: (bundle.seller_product_price || 0),
                    promotion_price: ((bundle.seller_product_price || 0) * (1 - (bundle.discount_percentage || 0) / 100)),
                    partner_product_name: bundle.partner_product_name,
                    partner_product_image: bundle.partner_product_image,
                    partner_product_price: bundle.partner_product_price,
                    seller_product_name: bundle.seller_product_name,
                    seller_product_image: bundle.seller_product_image
                },
                marketing_assets: {
                    vignettes: bundle.vignette_urls
                }
            });

            if (error) throw error;
            alert('Promotion created successfully!');
            onClose();
        } catch (err: any) {
            console.error('Error creating promotion:', err);
            alert('Failed to create promotion: ' + err.message);
        } finally {
            setCreating(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            {/* Accessibility Description */}
            <div className="sr-only" id="modal-description">
                AI-curated bundle suggestions for {partnerName}
            </div>

            {/* Modal Container - Wider (max-w-lg) & Taller */}
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 relative"
                aria-describedby="modal-description"
            >

                {/* Floating Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors backdrop-blur-md"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-white scrollbar-hide">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-[600px] text-center p-8">
                            <Loader2 className="animate-spin text-black mb-4" size={48} />
                            <h3 className="text-xl font-bold text-gray-900">Curating Bundles...</h3>
                            <p className="text-gray-500 mt-2 text-sm">
                                Analyzing {partnerName}'s catalog for perfect pairings.
                            </p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 px-6">
                            <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-block mb-4 text-sm">
                                {error}
                            </div>
                            <button
                                onClick={fetchSuggestions}
                                className="block mx-auto text-black font-bold hover:underline"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8 pb-8">
                            {suggestions.map((bundle, index) => (
                                <div key={index} className="relative group">

                                    {/* Full Bleed Image Carousel */}
                                    <div className="relative h-[600px] w-full bg-gray-900">
                                        {(() => {
                                            // Only show generated vignettes in the main carousel now
                                            const images = (bundle.vignette_urls || []).map((url, i) => ({ url, label: `AI Concept ${i + 1}` }));

                                            // If no images yet, show placeholder or loading state
                                            const isGenerating = generatingVignettes[index];

                                            const currentIndex = currentImageIndices[index] || 0;
                                            const currentImg = images[currentIndex];

                                            if (images.length === 0) {
                                                return (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                                        {isGenerating ? (
                                                            <>
                                                                <Loader2 className="animate-spin mb-3 text-white" size={32} />
                                                                <span className="text-sm font-medium text-gray-300">Generating Visuals...</span>
                                                            </>
                                                        ) : (
                                                            <div className="text-center p-4">
                                                                <p className="text-sm">Waiting for AI...</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            if (!currentImg) return null;

                                            return (
                                                <>
                                                    <img
                                                        src={currentImg.url}
                                                        alt={currentImg.label}
                                                        className="w-full h-full object-contain bg-gray-900"
                                                        onError={(e) => {
                                                            console.error('Failed to load image:', currentImg.url);
                                                            // Show error state
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.parentElement?.querySelector('.error-msg')?.classList.remove('hidden');
                                                        }}
                                                    />
                                                    <div className="error-msg hidden absolute inset-0 flex items-center justify-center bg-red-900/50 text-red-200 font-medium">
                                                        Image Failed to Load
                                                    </div>

                                                    {/* Gradient Overlay for Text Readability */}
                                                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

                                                    <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
                                                        <button
                                                            onClick={() => toggleSelection(index)}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${selectedIndices.has(index)
                                                                ? 'bg-blue-600 text-white ring-2 ring-white'
                                                                : 'bg-white/20 backdrop-blur hover:bg-white/40 text-white ring-1 ring-white/50'
                                                                }`}
                                                        >
                                                            {selectedIndices.has(index) ? <Check size={16} /> : <div className="w-4 h-4 rounded-sm border-2 border-white/80" />}
                                                        </button>
                                                        <span className="bg-white/90 backdrop-blur text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                                            Match #{index + 1}
                                                        </span>
                                                    </div>

                                                    {/* Image Label & Counter */}
                                                    <div className="absolute top-6 right-14 z-10 flex gap-1">
                                                        {images.map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
                                                            />
                                                        ))}
                                                    </div>

                                                    {/* Controls */}
                                                    {images.length > 1 && (
                                                        <>
                                                            <button
                                                                onClick={() => handlePrevImage(index, images.length)}
                                                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-all transform hover:scale-110"
                                                            >
                                                                <ChevronLeft size={28} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleNextImage(index, images.length)}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-all transform hover:scale-110"
                                                            >
                                                                <ChevronRight size={28} />
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Title Overlay */}
                                                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white pb-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20">
                                                        <h3 className="text-2xl font-bold leading-tight mb-2 shadow-sm">
                                                            {bundle.bundle_title}
                                                        </h3>
                                                        <p className="text-white/90 text-sm line-clamp-4 font-light">
                                                            {bundle.bundle_description}
                                                        </p>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* Action Card (Overlapping) */}
                                    <div className="relative -mt-12 mx-4 bg-white rounded-xl shadow-lg p-5 border border-gray-100 z-10">

                                        {/* Product Pairing with Thumbnails */}
                                        <div className="flex items-center gap-3 mb-5 text-sm border-b border-gray-100 pb-4">
                                            {/* Seller Product */}
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {bundle.seller_product_image && (
                                                    <img
                                                        src={bundle.seller_product_image}
                                                        alt="Your Product"
                                                        className="w-10 h-10 rounded-md object-cover border border-gray-200 shrink-0"
                                                    />
                                                )}
                                                <div className="font-medium text-gray-900 line-clamp-2 leading-tight text-xs">
                                                    {bundle.seller_product_name}
                                                </div>
                                            </div>

                                            <div className="text-gray-300 shrink-0 px-1">
                                                <ArrowRight size={14} />
                                            </div>

                                            {/* Partner Product */}
                                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                                                <div className="font-medium text-gray-900 line-clamp-2 leading-tight text-xs">
                                                    {bundle.partner_product_name}
                                                </div>
                                                {bundle.partner_product_image && (
                                                    <img
                                                        src={bundle.partner_product_image}
                                                        alt="Partner Product"
                                                        className="w-10 h-10 rounded-md object-cover border border-gray-200 shrink-0"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Editable Fields */}
                                        <div className="grid grid-cols-3 gap-3 mb-5">
                                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Discount</span>
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <input
                                                        type="number"
                                                        name={`discount-${index}`}
                                                        id={`discount-${index}`}
                                                        value={bundle.discount_percentage || 0}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            handleUpdateBundle(index, 'discount_percentage', isNaN(val) ? 0 : val);
                                                        }}
                                                        className="w-8 bg-transparent text-center font-bold text-gray-900 focus:outline-none p-0"
                                                    />
                                                    <span className="text-xs font-bold text-gray-900">%</span>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">MOQ</span>
                                                <input
                                                    type="number"
                                                    name={`moq-${index}`}
                                                    id={`moq-${index}`}
                                                    value={bundle.minimum_order_quantity || 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        handleUpdateBundle(index, 'minimum_order_quantity', isNaN(val) ? 0 : val);
                                                    }}
                                                    className="w-full bg-transparent text-center font-bold text-gray-900 focus:outline-none p-0"
                                                />
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Days</span>
                                                <input
                                                    type="number"
                                                    name={`days-${index}`}
                                                    id={`days-${index}`}
                                                    value={bundle.duration_days || 30}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        handleUpdateBundle(index, 'duration_days', isNaN(val) ? 0 : val);
                                                    }}
                                                    className="w-full bg-transparent text-center font-bold text-gray-900 focus:outline-none p-0"
                                                />
                                            </div>
                                        </div>

                                        {/* Price Calculation Display */}
                                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-5 text-sm gap-4">
                                            <div className="flex-1">
                                                <span className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Original Price</span>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                    <input
                                                        type="number"
                                                        value={bundle.seller_product_price || 0}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            handleUpdateBundle(index, 'seller_product_price', isNaN(val) ? 0 : val);
                                                        }}
                                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 pl-5 text-gray-900 font-medium focus:outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 text-right">
                                                <span className="block text-[10px] uppercase font-bold text-blue-600 mb-1">Deal Price</span>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-600 font-bold">$</span>
                                                    <input
                                                        type="number"
                                                        value={(((bundle.seller_product_price || 0) * (1 - (bundle.discount_percentage || 0) / 100))).toFixed(2)}
                                                        onChange={(e) => {
                                                            const dealPrice = parseFloat(e.target.value);
                                                            if (!isNaN(dealPrice) && (bundle.seller_product_price || 0) > 0) {
                                                                const newDiscount = 100 * (1 - dealPrice / (bundle.seller_product_price || 0));
                                                                handleUpdateBundle(index, 'discount_percentage', Math.max(0, Math.round(newDiscount)));
                                                            }
                                                        }}
                                                        className="w-full bg-blue-50 border border-blue-100 rounded px-2 py-1 pl-5 text-blue-700 font-bold text-right focus:outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Create Button */}
                                        <button
                                            onClick={() => handleCreatePromotion(index, bundle)}
                                            disabled={creating === index}
                                            className="w-full bg-black text-white py-3 rounded-lg font-bold text-sm hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                                        >
                                            {creating === index ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={16} />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    Create Promotion
                                                </>
                                            )}
                                        </button>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sticky Footer for Batch Action */}
                {selectedIndices.size > 0 && (
                    <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center animate-in slide-in-from-bottom-4">
                        <span className="text-sm font-medium text-gray-600">
                            {selectedIndices.size} bundle{selectedIndices.size > 1 ? 's' : ''} selected
                        </span>
                        <button
                            onClick={handleCreateBatch}
                            disabled={batchCreating}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
                        >
                            {batchCreating ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    Create {selectedIndices.size} Promotions
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
