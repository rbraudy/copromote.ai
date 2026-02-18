import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { TrendingUp, BarChart3, MessageSquare, Zap } from 'lucide-react';

export const AdminAnalytics = ({ demoMode = false }: { demoMode?: boolean }) => {
    const { companyId, loading: authLoading } = useAuth();
    const [stats, setStats] = useState({
        callsToday: 0,
        sales: 0,
        revenue: 0,
        closeRate: 0
    });

    useEffect(() => {
        if (demoMode) {
            setStats({
                callsToday: 142,
                sales: 38,
                revenue: 7562,
                closeRate: 26.8
            });
            return;
        }

        if (authLoading) return;
        if (companyId) fetchStats();
        // Analytics doesn't have a loading state to turn off really, 
        // as it just shows 0s if empty, but good to be consistent.
    }, [companyId, authLoading]);

    const fetchStats = async () => {
        // Mock fetch or lightweight query
        // In reality, we'd use a dedicated RPC for dashboard stats to avoid fetching all rows
        const { data } = await supabase
            .from('call_logs')
            .select('outcome, created_at')
            .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()); // Today

        if (data) {
            const calls = data.length;
            const sales = data.filter(r => r.outcome === 'sale').length;
            const revenue = sales * 199; // Assume $199 avg for now
            const closeRate = calls > 0 ? (sales / calls) * 100 : 0;

            setStats({
                callsToday: calls,
                sales,
                revenue,
                closeRate
            });
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <h2 className="text-2xl font-bold text-white mb-8">Performance Overview</h2>

            <div className="grid md:grid-cols-4 gap-6">
                <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800">
                    <Zap className="w-5 h-5 mb-4 text-yellow-500" />
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Calls Today</p>
                    <p className="text-2xl font-bold text-white">{stats.callsToday}</p>
                </div>

                <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800">
                    <TrendingUp className="w-5 h-5 mb-4 text-emerald-500" />
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Close Rate</p>
                    <p className="text-2xl font-bold text-white">{stats.closeRate.toFixed(1)}%</p>
                </div>

                <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800">
                    <BarChart3 className="w-5 h-5 mb-4 text-blue-500" />
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Revenue (Est)</p>
                    <p className="text-2xl font-bold text-white">${stats.revenue.toLocaleString()}</p>
                </div>

                <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800">
                    <MessageSquare className="w-5 h-5 mb-4 text-indigo-500" />
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Sentiment</p>
                    <p className="text-2xl font-bold text-white">Positive</p>
                </div>
            </div>

            <div className="mt-12 p-12 rounded-[40px] border border-white/5 bg-gradient-to-br from-white/5 to-transparent flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <BarChart3 className="text-slate-600 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-300">Detailed efficacy reporting</h3>
                <p className="text-slate-500 text-sm max-w-md">
                    Full visualization tools coming in Phase 4.
                </p>
            </div>
        </div>
    );
};
