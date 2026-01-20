import { useNavigate } from 'react-router-dom';
import HenrysHeader from '../components/Layout/HenrysHeader';
import { Check } from 'lucide-react';

const HelpPricing = () => {
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
            price: "$199",
            period: "/one-time",
            features: [
                "2 Year Extension",
                "Best Value for Mid-Range",
                "100% Coverage",
                "Anti-Lemon Policy",
                "Transferable"
            ],
            highlight: true,
            badge: "POPULAR"
        },
        {
            name: "3 Year",
            price: "$299",
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

    const navigate = useNavigate();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectPlan = (plan: any) => {
        navigate('/henrys/checkout', { state: { plan } });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black font-henrys text-slate-900 dark:text-white">
            <HenrysHeader />

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
                            className={`relative p-8 rounded-none border-2 flex flex-col ${plan.highlight
                                ? 'border-orange-600 bg-white dark:bg-zinc-900 scale-105 shadow-2xl z-10'
                                : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-black hover:border-orange-600/50'
                                } transition-all duration-300`}
                        >
                            {plan.badge && (
                                <div className="absolute top-0 right-0 bg-orange-600 text-white text-xs font-bold px-3 py-1 uppercase tracking-wider">
                                    {plan.badge}
                                </div>
                            )}
                            <h3 className="text-xl font-bold mb-2 uppercase">{plan.name}</h3>
                            <div className="mb-6">
                                <span className="text-4xl font-black text-black dark:text-white">{plan.price}</span>
                                <span className="text-sm text-gray-500 font-medium">{plan.period}</span>
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
                                className={`w-full py-3 font-bold uppercase tracking-wider transition-colors ${plan.highlight
                                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                    : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                                    }`}
                            >
                                Select Plan
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default HelpPricing;
