import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import HenrysHeader from '../components/Layout/HenrysHeader';
import {
    Clock,
    Shield,
    ArrowRight,
    Zap,
    Recycle
} from 'lucide-react';

interface PublicProspect {
    id: string;
    warranty_price_2yr: number | null;
    warranty_price_3yr: number | null;
    offer_discount_triggered: boolean;
    discount_price: number | null;
    discount_expiry: string | null;
}

const HelpPricing = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sessionId = searchParams.get('session');

    // --- Inlined Pricing Logic (to avoid HMR import issues) ---
    const [priceState, setPriceState] = useState<{
        discountedPrice: string | undefined;
        isDiscounted: boolean;
        basePrice2yr: string | undefined;
        basePrice3yr: string | undefined;
        loading: boolean;
    }>({
        discountedPrice: undefined,
        isDiscounted: false,
        basePrice2yr: undefined,
        basePrice3yr: undefined,
        loading: true
    });

    useEffect(() => {
        if (!sessionId) {
            setPriceState(prev => ({ ...prev, loading: false }));
            return;
        }

        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(sessionId)) {
            console.error('HelpPricing: Invalid UUID session ID');
            setPriceState(prev => ({ ...prev, loading: false }));
            return;
        }

        const fetchPrices = async () => {
            console.log('HelpPricing: Fetching Supabase data for:', sessionId);
            const { data, error } = await supabase
                .rpc('get_public_prospect', { p_id: sessionId })
                .single<PublicProspect>();

            if (error) {
                console.error('HelpPricing: Supabase Error:', error);
                setPriceState(prev => ({ ...prev, loading: false }));
                return;
            }

            if (data) {
                console.log('HelpPricing: Data received:', data);
                const format = (cents: number | null) => (cents ? (cents / 100).toFixed(2) : undefined);

                setPriceState({
                    discountedPrice: format(data.discount_price),
                    isDiscounted: !!data.offer_discount_triggered,
                    basePrice2yr: format(data.warranty_price_2yr),
                    basePrice3yr: format(data.warranty_price_3yr),
                    loading: false
                });
            } else {
                setPriceState(prev => ({ ...prev, loading: false }));
            }
        };

        fetchPrices();

        // Realtime Subscription
        const channel = supabase
            .channel(`pricing_${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'warranty_prospects',
                    filter: `id=eq.${sessionId}`
                },
                (payload) => {
                    console.log('HelpPricing: Realtime Update:', payload.new);
                    const newData = payload.new as PublicProspect;
                    const format = (cents: number | null) => (cents ? (cents / 100).toFixed(2) : undefined);

                    setPriceState(prev => ({
                        ...prev,
                        discountedPrice: format(newData.discount_price),
                        isDiscounted: !!newData.offer_discount_triggered,
                        basePrice2yr: format(newData.warranty_price_2yr),
                        basePrice3yr: format(newData.warranty_price_3yr)
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);
    // ---------------------------------------------------------

    const { discountedPrice, isDiscounted, basePrice2yr, basePrice3yr } = priceState;

    // Fallbacks
    const display2yr = discountedPrice || basePrice2yr || '199.00';
    const display3yr = basePrice3yr || '299.00';
    const monthlyPrice = (parseFloat(display2yr) / 16.5).toFixed(2);

    const handleSelectPlan = (plan: any) => {
        navigate('/henrys/checkout?session=' + sessionId, { state: { plan, prospectId: sessionId } });
    };

    const highlights = [
        { icon: <Clock className="w-5 h-5" />, title: 'No Waiting', desc: 'Over-the-counter exchanges on top items.' },
        { icon: <Shield className="w-5 h-5" />, title: 'Full Coverage', desc: '100% parts and labor, zero deductible.' },
        { icon: <Zap className="w-5 h-5" />, title: 'Lemon Proof', desc: 'Replace after 3 repairs for the same issue.' }
    ];

    const plans = [
        {
            name: 'Flex Monthly',
            price: `$${monthlyPrice}`,
            period: '/mo',
            desc: 'Cancel anytime. Peace of mind for as long as you need it.',
            icon: <Recycle className="w-6 h-6 text-blue-500" />,
            popular: false
        },
        {
            name: '2-Year Protection',
            price: `$${display2yr}`,
            period: ' total',
            desc: 'Our most popular choice. Locked-in savings for 24 months.',
            icon: <Shield className="w-6 h-6 text-green-500" />,
            popular: true,
            isDiscounted: isDiscounted
        },
        {
            name: '3-Year Ultimate',
            price: `$${display3yr}`,
            period: ' total',
            desc: 'Maximum protection. Best for expensive professional gear.',
            icon: <Zap className="w-6 h-6 text-amber-500" />,
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <HenrysHeader />

            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Protect Your Investment</h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        You've got the gear, now get the coverage. Henry's Extended Protection (HELP)
                        goes above and beyond traditional warranties.
                    </p>
                </div>

                {/* Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {highlights.map((h, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start space-x-4">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">{h.icon}</div>
                            <div>
                                <h3 className="font-bold text-slate-900">{h.title}</h3>
                                <p className="text-sm text-slate-500">{h.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            className={`relative bg-white rounded-2xl p-8 border ${plan.popular ? 'border-blue-500 ring-4 ring-blue-50/50 shadow-xl' : 'border-slate-200 shadow-sm'} flex flex-col`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                                    Best Value
                                </div>
                            )}

                            <div className="mb-6">
                                <div className="mb-4">{plan.icon}</div>
                                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                                <p className="text-sm text-slate-500">{plan.desc}</p>
                            </div>

                            <div className="mb-8">
                                {plan.isDiscounted && (
                                    <span className="text-sm text-green-600 font-bold bg-green-50 px-2 py-1 rounded mb-2 inline-block">
                                        Special One-Time Offer
                                    </span>
                                )}
                                <div className="flex items-baseline">
                                    <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                                    <span className="text-slate-500 ml-1">{plan.period}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => handleSelectPlan(plan)}
                                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all ${plan.popular
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                                    }`}
                            >
                                <span>Get Protection</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* FAQ Snippet */}
                <div className="mt-20 border-t border-slate-200 pt-16">
                    <h2 className="text-2xl font-bold text-center mb-12">Frequently Asked Questions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <div>
                            <h4 className="font-bold mb-2">When does coverage start?</h4>
                            <p className="text-sm text-slate-600">Right now. We bridge your 7-day gift coverage directly into your selected plan so there's never a gap.</p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-2">What's the 'Anti-Lemon' guarantee?</h4>
                            <p className="text-sm text-slate-600">If your gear requires 3 repairs for the same recurring issue, we simply replace it with a brand new one.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpPricing;
