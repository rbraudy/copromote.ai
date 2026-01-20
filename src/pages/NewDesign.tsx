import { useState, useEffect } from 'react';
import {
    ArrowRight, Shield, TrendingUp, Users,
    BarChart3, Upload, Play, CheckCircle2,
    Clock, Zap, BrainCircuit, MessageSquare
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import Header from '../components/Layout/Header';
import SignInModal from '../components/Auth/SignInModal';
import SignUpModal from '../components/Auth/SignUpModal'; // Keeping for reference
import WarrantySignUpModal from '../components/Auth/WarrantySignUpModal';
import { DemoCallModal } from '../components/Dashboard/DemoCallModal';

const NewDesign = () => {
    const [activeTab, setActiveTab] = useState('campaign');
    const [user, setUser] = useState<User | null>(null);
    const [isSignInOpen, setIsSignInOpen] = useState(false);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [isDemoOpen, setIsDemoOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const handleViewDemo = () => {
        if (user) {
            setIsDemoOpen(true);
        } else {
            setIsSignInOpen(true);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
            <Header
                userEmail={user?.email || null}
                onSignInClick={() => setIsSignInOpen(true)}
                onSignUpClick={() => setIsSignUpOpen(true)}
                onSignOutClick={handleSignOut}
            />

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-to-b from-blue-500/10 via-transparent to-transparent -z-10" />
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8 backdrop-blur-sm animate-fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        WORLD'S MOST ADVANCED AI WARRANTY SALES AGENTS
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent leading-[1.1]">
                        Sell More Warranties <br />With AI That Closes.
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Revolutionize your device and equipment warranty sales with autonomous AI agents that deliver the highest close rates in the market.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => setIsSignUpOpen(true)}
                            className="w-full sm:w-auto px-8 py-4 bg-blue-600 rounded-2xl font-semibold hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group"
                        >
                            Deploy Your Agents <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={handleViewDemo}
                            className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-semibold hover:bg-white/10 transition-all"
                        >
                            View Demo
                        </button>
                    </div>
                </div>
            </section>

            <SignInModal
                isOpen={isSignInOpen}
                onClose={() => setIsSignInOpen(false)}
                onSignInSuccess={(user) => {
                    setUser(user);
                    setIsSignInOpen(false);
                }}
            />
            <WarrantySignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
            {/* <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} /> */}
            <DemoCallModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />

            {/* Value Prop Grid */}
            <section id="features" className="py-24 border-t border-white/5 bg-slate-950">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <TrendingUp className="text-emerald-500 w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">World Class Sales Experts</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Our agents leverage industry-leading best practices and real-world expertise to deliver high-impact results for your business, consistently and at scale.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <BrainCircuit className="text-blue-500 w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Self-Optimizing Loops</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Our agents listen, evaluate, and learn from every interaction, automatically improving sales techniques after each call.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="text-indigo-500 w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Persona-Matched Sales</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Dynamically adjusts tone, speed, and pitch based on the customer's market and individual persona for maximum conversion.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Admin Functionality Section */}
            <section id="admin" className="py-24 relative overflow-hidden">
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -z-10" />
                <div className="max-w-7xl mx-auto px-6">
                    <div className="max-w-3xl mb-16">
                        <h2 className="text-4xl font-bold mb-6 italic tracking-tight uppercase">Campaign Management</h2>
                        <p className="text-slate-400 text-lg">
                            Empower your administrators to launch global warranty sales campaigns in minutes. Upload, trigger, and scale with ease.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-white/10 rounded-[40px] p-8 md:p-12 backdrop-blur-xl shadow-2xl">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <div className="flex gap-4 mb-8 p-1 bg-slate-800/50 rounded-2xl w-fit">
                                    <button
                                        onClick={() => setActiveTab('campaign')}
                                        className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'campaign' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Builder
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('queue')}
                                        className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'queue' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Live Queue
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-start gap-4">
                                        <div className="p-3 bg-blue-500/10 rounded-xl">
                                            <Upload className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-1">Batch Lead Upload</h4>
                                            <p className="text-sm text-slate-400">Import CSV or Excel files with customer purchase history and device data.</p>
                                        </div>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-start gap-4">
                                        <div className="p-3 bg-indigo-500/10 rounded-xl">
                                            <Play className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-1">Instant Execution</h4>
                                            <p className="text-sm text-slate-400">Trigger thousands of personalized sales calls with a single click.</p>
                                        </div>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-start gap-4">
                                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-1">Rule-Based Automation</h4>
                                            <p className="text-sm text-slate-400">Set criteria for automatic follow-ups and SMS confirmations.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative group">
                                {/* Mockup UI Interface */}
                                <div className="bg-slate-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative aspect-square md:aspect-auto md:h-[500px]">
                                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                        <div className="flex gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                        </div>
                                        <span className="text-xs text-slate-500 font-mono tracking-widest uppercase">Admin Dashboard v2.0</span>
                                    </div>
                                    <div className="p-8 space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h5 className="text-xl font-bold">New Campaign</h5>
                                                <p className="text-xs text-slate-500">Launch a new agent sprint</p>
                                            </div>
                                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                                                <ArrowRight className="text-white w-6 h-6" />
                                            </div>
                                        </div>

                                        <div className="border-2 border-dashed border-white/10 rounded-3xl p-10 flex flex-col items-center justify-center group/drop hover:border-blue-500/50 transition-colors">
                                            <Upload className="w-10 h-10 text-slate-600 group-hover/drop:text-blue-400 transition-colors mb-4" />
                                            <p className="text-sm text-slate-400">Drop lead list here</p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-600 w-2/3 animate-pulse" />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                                                <span>PROCESSING 6,420 LEADS...</span>
                                                <span>67%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Analytics Placeholder Section */}
            <section id="analytics" className="py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                        <div>
                            <h2 className="text-4xl font-bold mb-4 tracking-tight">Advanced Analytics</h2>
                            <p className="text-slate-400">Gain real-time insights into campaign efficacy and agent performance.</p>
                        </div>
                        <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-xs font-bold uppercase tracking-widest">
                            Coming Soon
                        </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6 opacity-40 grayscale pointer-events-none">
                        {[
                            { label: 'Close Rate', value: '42.8%', icon: TrendingUp, color: 'text-emerald-400' },
                            { label: 'Total Revenue', value: '$124.5k', icon: BarChart3, color: 'text-blue-400' },
                            { label: 'Avg Sentiment', value: 'Positive', icon: MessageSquare, color: 'text-indigo-400' },
                            { label: 'Calls Today', value: '1,420', icon: Zap, color: 'text-yellow-400' }
                        ].map((stat, i) => (
                            <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/10">
                                <stat.icon className={`w-5 h-5 mb-4 ${stat.color}`} />
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-2xl font-bold">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-12 rounded-[40px] border border-white/5 bg-gradient-to-br from-white/5 to-transparent flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <BarChart3 className="text-slate-600 w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-slate-300">Detailed efficacy reporting</h3>
                        <p className="text-slate-500 text-sm max-w-md">
                            Full suite of visualization tools including conversion funnels, regional heatmaps, and AI sentiment analysis.
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 text-center text-slate-500 text-sm">
                <p>&copy; 2026 CoPromote.ai - The Future of Warranty Sales</p>
            </footer>
        </div >
    );
};

export default NewDesign;
