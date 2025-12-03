import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Loader2, ArrowRight, MessageSquare } from 'lucide-react';

interface ProposalDetailProps {
    isOpen: boolean;
    onClose: () => void;
    proposal: any;
    onUpdate: () => void;
}

export const ProposalDetail = ({ isOpen, onClose, proposal, onUpdate }: ProposalDetailProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        discount: 0,
        moq: 0,
        duration: 30,
        title: '',
        description: '',
        original_price: 0,
        promotion_price: 0
    });
    const [status, setStatus] = useState('');
    const [sellerProduct, setSellerProduct] = useState<any>(null);

    useEffect(() => {
        if (proposal) {
            setFormData({
                discount: proposal.offer_details?.discount || 0,
                moq: proposal.offer_details?.moq || 0,
                duration: proposal.offer_details?.duration || 30,
                title: proposal.offer_details?.title || '',
                description: proposal.offer_details?.description || '',
                original_price: proposal.offer_details?.original_price || 0,
                promotion_price: proposal.offer_details?.promotion_price || 0
            });
            setStatus(proposal.status);

            // Fetch seller product if missing (due to join removal)
            if (!proposal.seller_product && proposal.seller_product_id) {
                fetchSellerProduct(proposal.seller_product_id);
            } else {
                setSellerProduct(proposal.seller_product);
            }
        }
    }, [proposal]);

    const fetchSellerProduct = async (id: string) => {
        const { data } = await supabase
            .from('products')
            .select('name, "imageUrl"')
            .eq('id', id)
            .single();

        if (data) setSellerProduct({
            title: data.name,
            image_url: data.imageUrl
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

    const handleSave = async () => {
        setLoading(true);
        try {
            // Update product price if changed
            if (formData.original_price !== proposal.offer_details?.original_price) {
                await updateProductPrice(proposal.seller_product_id, formData.original_price);
            }

            const { error } = await supabase
                .from('copromotions')
                .update({
                    offer_details: {
                        ...proposal.offer_details,
                        discount: formData.discount,
                        moq: formData.moq,
                        duration: formData.duration,
                        title: formData.title,
                        description: formData.description,
                        original_price: formData.original_price,
                        promotion_price: formData.promotion_price
                    },
                    status: status
                })
                .eq('id', proposal.id);

            if (error) throw error;
            onUpdate();
        } catch (err) {
            console.error('Error updating proposal:', err);
            alert('Failed to update proposal');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">

                {/* Floating Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors backdrop-blur-md"
                >
                    <X size={20} />
                </button>

                <div className="flex-1 overflow-y-auto bg-white scrollbar-hide">
                    {/* Hero Image Section */}
                    <div className="relative h-[400px] w-full bg-gray-900">
                        {proposal.marketing_assets?.vignettes?.[0] ? (
                            <img
                                src={proposal.marketing_assets.vignettes[0]}
                                alt="Preview"
                                className="w-full h-full object-contain bg-gray-900"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                No Preview Image
                            </div>
                        )}

                        {/* Title Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white pb-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20">
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-transparent text-2xl font-bold leading-tight mb-2 shadow-sm border-none focus:ring-0 placeholder-gray-400 text-white"
                                placeholder="Bundle Title"
                            />
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                                className="w-full bg-transparent text-white/90 text-sm font-light border-none focus:ring-0 resize-none placeholder-gray-400"
                                placeholder="Bundle Description"
                            />
                        </div>
                    </div>

                    {/* Overlapping Card Content */}
                    <div className="relative -mt-12 mx-4 bg-white rounded-xl shadow-lg p-5 border border-gray-100 z-10 mb-8">

                        {/* Product Pairing Row */}
                        <div className="flex items-center gap-3 mb-5 text-sm border-b border-gray-100 pb-4">
                            {/* Seller Product */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {sellerProduct?.image_url && (
                                    <img
                                        src={sellerProduct.image_url}
                                        alt="Your Product"
                                        className="w-10 h-10 rounded-md object-cover border border-gray-200 shrink-0"
                                    />
                                )}
                                <div className="font-medium text-gray-900 line-clamp-2 leading-tight text-xs">
                                    {sellerProduct?.title || 'Your Product'}
                                </div>
                            </div>

                            <div className="text-gray-300 shrink-0 px-1">
                                <ArrowRight size={14} />
                            </div>

                            {/* Partner Product */}
                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                                <div className="font-medium text-gray-900 line-clamp-2 leading-tight text-xs">
                                    {proposal.offer_details?.partner_product_name || 'Partner Product'}
                                </div>
                                {proposal.offer_details?.partner_product_image && (
                                    <img
                                        src={proposal.offer_details.partner_product_image}
                                        alt="Partner Product"
                                        className="w-10 h-10 rounded-md object-cover border border-gray-200 shrink-0"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Editable Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                                <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Discount</span>
                                <div className="flex items-center justify-center gap-0.5">
                                    <input
                                        type="number"
                                        value={formData.discount}
                                        onChange={e => {
                                            const val = parseInt(e.target.value);
                                            const newDiscount = isNaN(val) ? 0 : val;
                                            setFormData(prev => ({
                                                ...prev,
                                                discount: newDiscount,
                                                promotion_price: prev.original_price * (1 - newDiscount / 100)
                                            }));
                                        }}
                                        className="w-12 bg-transparent text-center font-bold text-gray-900 focus:outline-none p-0"
                                    />
                                    <span className="text-xs font-bold text-gray-900">%</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                                <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">MOQ</span>
                                <input
                                    type="number"
                                    value={formData.moq}
                                    onChange={e => setFormData({ ...formData, moq: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-transparent text-center font-bold text-gray-900 focus:outline-none p-0"
                                />
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                                <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Days</span>
                                <input
                                    type="number"
                                    value={formData.duration}
                                    onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-transparent text-center font-bold text-gray-900 focus:outline-none p-0"
                                />
                            </div>
                        </div>

                        {/* Price Row */}
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-5 text-sm gap-4">
                            <div className="flex-1">
                                <span className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Original Price</span>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={formData.original_price}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            const newOriginal = isNaN(val) ? 0 : val;
                                            setFormData(prev => ({
                                                ...prev,
                                                original_price: newOriginal,
                                                promotion_price: newOriginal * (1 - prev.discount / 100)
                                            }));
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
                                        value={formData.promotion_price.toFixed(2)}
                                        onChange={(e) => {
                                            const dealPrice = parseFloat(e.target.value);
                                            if (!isNaN(dealPrice) && formData.original_price > 0) {
                                                const newDiscount = 100 * (1 - dealPrice / formData.original_price);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    promotion_price: dealPrice,
                                                    discount: Math.max(0, Math.round(newDiscount))
                                                }));
                                            }
                                        }}
                                        className="w-full bg-blue-50 border border-blue-100 rounded px-2 py-1 pl-5 text-blue-700 font-bold text-right focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status Toggle */}
                        <div className="mb-5">
                            <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Proposal Status</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {['draft', 'sent'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStatus(s)}
                                        className={`flex-1 py-2 rounded-md text-sm font-bold capitalize transition-all ${status === s
                                            ? 'bg-white text-black shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="w-full bg-black text-white py-3 rounded-lg font-bold text-sm hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
