import { useNavigate, useSearchParams } from 'react-router-dom';
import HenrysHeader from '../components/Layout/HenrysHeader';
import { Check, Sparkles } from 'lucide-react'; // Added Sparkles
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const HelpPricing = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session');

    // Default Prices
    const [twoYearPrice, setTwoYearPrice] = useState(199);
    const [threeYearPrice, setThreeYearPrice] = useState(299);
    const [showDiscountBanner, setShowDiscountBanner] = useState(false);

    const navigate = useNavigate();

    // Fetch Initial Prospect Data & Connect Realtime
    useEffect(() => {
        if (!sessionId) return;

        const fetchProspectData = async () => {
            console.log("🔍 Fetching Prospect Data for:", sessionId);
            const { data, error } = await supabase
                .from('warranty_prospects')
                .select('warranty_price_2yr, warranty_price_3yr')
                .eq('id', sessionId)
                .single();

            if (data) {
                console.log("✅ Found Prospect Pricing:", data);
                if (data.warranty_price_2yr) setTwoYearPrice(data.warranty_price_2yr);
                if (data.warranty_price_3yr) setThreeYearPrice(data.warranty_price_3yr);
            } else if (error) {
                console.error("❌ Error fetching prospect:", error);
            }
        };

        fetchProspectData();

        console.log("🔌 Connecting to Realtime Session:", sessionId);

        const channel = supabase
            .channel('price-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'warranty_sessions',
                    filter: `id=eq.${sessionId}`
                },
                (payload) => {
                    console.log("⚡ Realtime Update:", payload);
                    if (payload.new && payload.new.current_price) {
                        setTwoYearPrice(payload.new.current_price);
                        setShowDiscountBanner(true);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    const plans = [
        {
            name: "Monthly",
            price: "$12",
            period: "/month",
            features: [
                "Cancel anytime",
                "100% Coverage",
                "Anti-Lemon Policy",
                "Transferable"
            ],
            highlight: false
        },
        {
            name: "1 Year",
            price: "$119",
            period: "/one-time",
            features: [
                "1 Year Extension",
                "100% Coverage",
                "Anti-Lemon Policy",
                "Transferable",
                "Price Protection"
            ],
            highlight: false
        },
        {
            name: "2 Year",
            price: `$${twoYearPrice}`, // Dynamic Price
            period: "/one-time",
            features: [
                "2 Year Extension",
                "Best Value for Mid-Range",
                "100% Coverage",
                "Anti-Lemon Policy",
                "Transferable"
            ],
            highlight: true,
            badge: showDiscountBanner ? "SPECIAL OFFER" : "POPULAR", // Dynamic Badge
            isDiscounted: showDiscountBanner // Flag for styling
        },
        {
            name: "3 Year",
            price: `$${threeYearPrice}`,
            period: "/one-time",
            features: [
                "3 Year Extension",
                "Maximum Protection",
                "100% Coverage",
                "Anti-Lemon Policy",
                "Transferable"
            ],
            highlight: false
        }
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectPlan = (plan: any) => {
        navigate('/henrys/checkout', { state: { plan } });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black font-henrys text-slate-900 dark:text-white transition-colors duration-500">
            <HenrysHeader />

            <div className={`fixed top-0 left-0 w-full bg-orange-600 text-white text-center py-2 font-bold transform transition-transform duration-500 z-50 ${showDiscountBanner ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="flex items-center justify-center gap-2">
                    <Sparkles size={20} fill="white" />
                    <span>SPECIAL OFFER APPLIED!</span>
                    <Sparkles size={20} fill="white" />
                </div>
            </div>

            <header className="pt-32 pb-12 px-6 text-center">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 uppercase italic">
                        Choose Your <span className="text-orange-600">Protection</span>
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Flexible plans designed to keep you shooting.
                    </p>
                </div>
            </header>

            <section className="py-12 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map((plan, idx) => (
                        <div
                            key={idx}
                            className={`relative p-8 rounded-none border-2 flex flex-col transition-all duration-500 ${plan.highlight
                                ? 'border-orange-600 bg-white dark:bg-zinc-900 scale-105 shadow-2xl z-10'
                                : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-black hover:border-orange-600/50'
                                } ${plan.isDiscounted ? 'ring-4 ring-orange-500/50 shadow-orange-500/20' : ''}`}
                        >
                            {plan.badge && (
                                <div className={`absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 uppercase tracking-wider transition-colors duration-300 ${plan.isDiscounted ? 'bg-green-600 animate-pulse' : 'bg-orange-600'}`}>
                                    {plan.badge}
                                </div>
                            )}
                            <h3 className="text-xl font-bold mb-2 uppercase">{plan.name}</h3>
                            <div className="mb-6">
                                <span className={`text-4xl font-black transition-all duration-500 ${plan.isDiscounted ? 'text-green-600 scale-110 inline-block' : 'text-black dark:text-white'}`}>{plan.price}</span>
                                <span className="text-sm text-gray-500 font-medium">{plan.period}</span>
                                {plan.isDiscounted && <div className="text-xs text-gray-400 line-through mt-1">$199.00</div>}
                            </div>

                            <ul className="space-y-4 mb-8 flex-grow">
                                {plan.features.map((feature, fIdx) => (
                                    <li key={fIdx} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                        <Check size={18} className="text-orange-600 shrink-0 mt-0.5" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleSelectPlan(plan)}
                                className={`w-full py-3 font-bold uppercase tracking-wider transition-all duration-300 ${plan.highlight
                                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                    : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                                    } ${plan.isDiscounted ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30' : ''}`}
                            >
                                Select Plan
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* What's Covered Section */}
            <section className="py-16 px-6 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-black text-center mb-12 uppercase italic">
                        What's <span className="text-orange-600">Considered Covered</span>?
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Mechanical */}
                        <div className="p-6 bg-slate-50 dark:bg-black border border-gray-200 dark:border-zinc-800">
                            <h3 className="text-lg font-bold mb-4 uppercase text-orange-600">Mechanical Failures</h3>
                            <ul className="space-y-3 font-medium">
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> Shutter Mechanism ($400+ val)</li>
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> Auto-Focus Motor ($650+ val)</li>
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> Zoom/Focus Rings</li>
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> Main Board Failure</li>
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> Sensor Issues</li>
                            </ul>
                        </div>

                        {/* Electronic/Display */}
                        <div className="p-6 bg-slate-50 dark:bg-black border border-gray-200 dark:border-zinc-800">
                            <h3 className="text-lg font-bold mb-4 uppercase text-orange-600">Electronic & Display</h3>
                            <ul className="space-y-3 font-medium">
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> LCD Screen Failure</li>
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> EVF (Viewfinder) Burn-out</li>
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> Card Slot Reader pins</li>
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> HDMI/USB Port issues</li>
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> Unexpected Power failure</li>
                            </ul>
                        </div>

                        {/* Policies */}
                        <div className="p-6 bg-slate-50 dark:bg-black border border-gray-200 dark:border-zinc-800">
                            <h3 className="text-lg font-bold mb-4 uppercase text-orange-600">Zero-Hassle Policy</h3>
                            <ul className="space-y-3 font-medium">
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> No Deductibles ($0)</li>
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> 100% Parts & Labour</li>
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> Lemon Protection (3 strikes)</li>
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> Fully Transferable</li>
                                <li className="flex gap-2"><Check size={20} className="text-green-500 shrink-0" /> Global Coverage</li>
                            </ul>
                        </div>
                    </div>
                    <p className="text-center text-gray-500 mt-12 text-sm max-w-2xl mx-auto">
                        *Does not cover accidental damage (drops, spills, impact, water), lost or stolen items, or cosmetic damage that does not affect performance.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default HelpPricing;
