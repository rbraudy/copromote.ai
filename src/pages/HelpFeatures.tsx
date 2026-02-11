import HenrysHeader from '../components/Layout/HenrysHeader';
import { Shield, Settings, Globe, RefreshCcw, UserCheck, AlertTriangle, Percent, Calendar, DollarSign, Sparkles, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDiscount } from '../hooks/useDiscount';

const HelpFeatures = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session');

    // 🔥 Magic Pricing Hook
    const { isDiscounted } = useDiscount(sessionId);

    // 🏆 Success Modal State
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (searchParams.get('success') === 'true') {
            setShowSuccess(true);
            // Optional: Clean URL
            // navigate('/henrys', { replace: true }); 
            // Better to keep it for refresh persistence or handle via state
        }
    }, [searchParams]);

    const features = [
        {
            icon: <Shield className="w-8 h-8 text-orange-600" />,
            title: "100% Parts & Labour Covered",
            description: "In the event that your gear is deemed to be defective, the repair or replacement parts and labour will be 100% covered throughout your H.E.L.P. term."
        },
        {
            icon: <AlertTriangle className="w-8 h-8 text-orange-600" />,
            title: "Anti-Lemon Protection",
            description: "If your product requires more than two repairs for any problem covered under the manufacturer's warranty, we will replace it over the counter."
        },
        {
            icon: <Settings className="w-8 h-8 text-orange-600" />,
            title: "Fully Administered by Henry's",
            description: "Managed by our experts. Never consult a third party. We stand behind our support."
        },
        {
            icon: <Globe className="w-8 h-8 text-orange-600" />,
            title: "Global Coverage",
            description: "We can help you find an authorized service centre anywhere in the world. Wherever life takes you, we've got you covered."
        },
        {
            icon: <RefreshCcw className="w-8 h-8 text-orange-600" />,
            title: "30 Day Exchange for Defects",
            description: "If your product develops a defect within the first 30 days, we'll simply replace it over the counter."
        },
        {
            icon: <UserCheck className="w-8 h-8 text-orange-600" />,
            title: "100% Transferable",
            description: "H.E.L.P. stays with the product, even if you sell it to a new owner, protecting your gear's resale value."
        },
        {
            icon: <Percent className="w-8 h-8 text-orange-600" />,
            title: "20% Off At-Fault Repairs",
            description: "If your product needs repair due to external damage (water, sand or impact), H.E.L.P. reduces the cost by 20%."
        },
        {
            icon: <Calendar className="w-8 h-8 text-orange-600" />,
            title: "Available in 2 or 3 Year Plans",
            description: "Choose the level of protection you think is best for your new purchase."
        },
        {
            icon: <DollarSign className="w-8 h-8 text-orange-600" />,
            title: "30 Day Price Protection",
            description: "extends our Price Protection policy for up to 30 days. You'll always get the best product at the best price."
        }
    ];

    const handleNavigation = () => {
        const url = sessionId ? `/henrys/pricing?session=${sessionId}` : '/henrys/pricing';
        navigate(url);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-henrys text-slate-900 dark:text-slate-100 transition-colors duration-500">
            <HenrysHeader />

            {/* 🎩 Magic Pricing Banner */}
            <div className={`fixed top-0 left-0 w-full bg-orange-600 text-white text-center py-3 font-bold transform transition-transform duration-500 z-50 shadow-lg ${isDiscounted ? 'translate-y-0' : '-translate-y-full'}`}>
                <div onClick={handleNavigation} className="flex items-center justify-center gap-2 cursor-pointer hover:scale-105 transition-transform">
                    <Sparkles size={20} fill="white" className="animate-pulse" />
                    <span className="tracking-widest">MANAGER'S SPECIAL UNLOCKED! CLICK TO VIEW</span>
                    <Sparkles size={20} fill="white" className="animate-pulse" />
                </div>
            </div>

            {/* ✅ Success Modal */}
            {
                showSuccess && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-zinc-900 border-2 border-green-500 max-w-md w-full p-8 relative shadow-2xl transform animate-in zoom-in-95 duration-300">
                            <button
                                onClick={() => setShowSuccess(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white"
                            >
                                <X size={24} />
                            </button>

                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                    <Check size={40} className="text-green-600 dark:text-green-400" />
                                </div>
                            </div>

                            <h2 className="text-3xl font-black text-center uppercase italic mb-4">You're Covered!</h2>
                            <p className="text-center text-gray-600 dark:text-gray-300 mb-8 text-lg">
                                Thank you for adding H.E.L.P. to your gear. A confirmation email has been sent to your inbox.
                            </p>

                            <button
                                onClick={() => setShowSuccess(false)}
                                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-wider"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Hero Section */}
            <header className="pt-32 pb-16 px-6 text-center bg-white dark:bg-black relative overflow-hidden">
                {/* Henry's Accent Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-orange-600"></div>

                <div className="max-w-4xl mx-auto relative z-10">
                    <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-6 text-black dark:text-white uppercase italic">
                        Protect your purchase. <br /> <span className="text-orange-600">Enjoy it longer.</span>
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto font-medium">
                        Henry’s Extended Limited Protection Plan (H.E.L.P.) extends the manufacturer's warranty and adds exclusive benefits to keep you shooting.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={handleNavigation}
                            className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-wider rounded-sm transition-all shadow-lg hover:shadow-orange-600/25 flex items-center justify-center gap-2 transform hover:-translate-y-1"
                        >
                            See Pricing <Shield size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Features Grid */}
            <section className="py-20 px-6 max-w-7xl mx-auto bg-gray-50 dark:bg-zinc-900">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, idx) => (
                        <div key={idx} className="p-8 bg-white dark:bg-black border-l-4 border-orange-600 shadow-sm hover:shadow-xl transition-all group">
                            <div className="mb-6 p-4 bg-orange-50 dark:bg-zinc-800 w-fit group-hover:scale-110 transition-transform">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Usage/Timeline Section */}
            <section className="py-20 px-6 bg-black text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-black uppercase italic mb-12 text-white">How H.E.L.P. Compares</h2>
                    <div className="bg-zinc-900 p-8 border border-zinc-800">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 text-left">
                                <div className="w-8 h-8 bg-zinc-700 flex items-center justify-center text-zinc-400 font-bold rounded-none">1</div>
                                <div>
                                    <h4 className="font-bold text-gray-300">Manufacturer Warranty (1 Year)</h4>
                                    <p className="text-sm text-gray-500">Covers factory defects only. Requires shipping to depot. 4-6 weeks downtime.</p>
                                </div>
                            </div>
                            <div className="w-px h-8 bg-zinc-700 ml-4"></div>
                            <div className="flex items-center gap-4 text-left">
                                <div className="w-8 h-8 bg-orange-600 flex items-center justify-center text-white font-bold rounded-none">2</div>
                                <div>
                                    <h4 className="font-bold text-orange-500 uppercase">Henry's Extended Limited Protection Plan (+2/3 Years)</h4>
                                    <p className="text-sm text-gray-400">Extends coverage length. Adds lemon protection, price protection, and over-the-counter exchange.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer CTA */}
            <section className="py-20 px-6 text-center bg-white dark:bg-black">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-black uppercase italic mb-6">Ready to protect your gear?</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Don't wait until it's too late. Add H.E.L.P. to your cart today.
                    </p>
                    <button
                        onClick={handleNavigation}
                        className="px-12 py-4 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-wider rounded-sm transition-all hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white"
                    >
                        Buy Now
                    </button>
                </div>
            </section>
        </div >
    );
};

export default HelpFeatures;
