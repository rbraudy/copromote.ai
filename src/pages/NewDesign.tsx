import { useState } from 'react';
import {
    ArrowRight, TrendingUp, Users,
    BarChart3,
    Zap, BrainCircuit, MessageSquare, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Layout/Header';
import SignInModal from '../components/Auth/SignInModal';
// import SignUpModal from '../components/Auth/SignUpModal'; // Keeping for reference
import WarrantySignUpModal from '../components/Auth/WarrantySignUpModal';


const NewDesign = () => {
    const [activeTab, setActiveTab] = useState('campaign');
    // user and signOut are now managed by useAuth
    const { user, loading: authLoading } = useAuth();
    // Restoring local state for Modals
    const [isSignInOpen, setIsSignInOpen] = useState(false);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);


    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">Securing session...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        setIsSignInOpen(true);
    }

    const handleViewDemo = () => {
        if (!user) {
            setIsSignInOpen(true);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
            <Header
                onSignInClick={() => setIsSignInOpen(true)}
                onSignUpClick={() => setIsSignUpOpen(true)}
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
                        Sell More Extended Protection Plans <br />With AI That Closes.
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Maximize your device and equipment warranty sales with expert AI agents that deliver the highest close rates in the industry.
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
                onSignInSuccess={() => {
                    // Auth state matches automatically via context
                    setIsSignInOpen(false);
                }}
            />
            <WarrantySignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
            {/* <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} /> */}

            {/* Value Prop Grid */}
            <section id="features" className="py-24 border-t border-white/5 bg-slate-950">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <TrendingUp className="text-emerald-500 w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Elite Sales Performance</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Our agents make us of the leading sales approaches to identify client needs, handle objections, and <strong className="text-slate-200">close deals</strong> better than your best sales rep.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <BrainCircuit className="text-blue-500 w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Adaptive Sales Intelligence</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Our agents tailor their sales pitches in real time based on specific customer interactions and learnings from previous conversations to optimize revenue.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="text-indigo-500 w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Integrated Real-Time Support Concierge</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Warranty sales calls often become your front line for customer support. Our AI concierge integrates directly with your ERP, CRM, and shipping data to resolve issues in real time—turning a sales call into a seamless service experience.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
                            <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Zap className="text-yellow-500 w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Infinite, Instant Scale</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Launch thousands of calls in minutes. No hiring, no training, no sick days. Just on-demand sales capacity that scales up or down instantly to match your needs.
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
                            Empower your administrators to launch global warranty sales campaigns in minutes.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-white/10 rounded-[40px] p-8 md:p-12 backdrop-blur-xl shadow-2xl">

                        {/* Tab Navigation */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                            <div className="flex flex-wrap gap-4 p-1 bg-slate-800/50 rounded-2xl w-fit">
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
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Analytics
                                </button>
                            </div>

                            {/* Content Area */}
                            {!user && (
                                <div className="absolute -top-12 right-0 bg-blue-600/20 border border-blue-500/30 text-blue-200 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                    Interactive Demo Mode
                                </div>
                            )}

                            {activeTab === 'campaign' && <div className="text-center py-20">Campaign Builder Placeholder</div>}
                            {activeTab === 'queue' && <div className="text-center py-20">Live Queue Placeholder</div>}
                            {activeTab === 'analytics' && <div className="text-center py-20">Admin Analytics Placeholder</div>}

                            {!user && (
                                <div className="mt-8 p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between backdrop-blur-sm">
                                    <div className="text-sm text-slate-400">
                                        You are viewing example data. Sign in to connect your own AI agents.
                                    </div>
                                    <button
                                        onClick={() => setIsSignInOpen(true)}
                                        className="px-4 py-2 bg-white text-slate-900 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors"
                                    >
                                        Sign In
                                    </button>
                                </div>
                            )}
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
