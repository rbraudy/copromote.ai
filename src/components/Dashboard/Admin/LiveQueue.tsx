import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Phone, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface CallLog {
    id: string;
    created_at: string;
    warranty_prospect_id: string;
    connection_status: string;
    outcome: string;
    duration: string;
    prospect?: {
        customer_name: string;
        phone: string;
        product_name: string;
    };
}

export const LiveQueue = ({ demoMode = false }: { demoMode?: boolean }) => {
    const { companyId, loading: authLoading } = useAuth();
    const [logs, setLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (demoMode) {
            setLogs([
                { id: '1', created_at: new Date().toISOString(), warranty_prospect_id: '1', connection_status: 'SUCCESS', outcome: 'sale', duration: '2m 15s', prospect: { customer_name: 'Customer #8821', phone: '(555) 123-****', product_name: 'Premium Subscription' } },
                { id: '2', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), warranty_prospect_id: '2', connection_status: 'SUCCESS', outcome: 'call_back', duration: '45s', prospect: { customer_name: 'Customer #8820', phone: '(555) 987-****', product_name: 'Enterprise Plan' } },
                { id: '3', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), warranty_prospect_id: '3', connection_status: 'FAILED', outcome: 'voicemail', duration: '0s', prospect: { customer_name: 'Customer #8819', phone: '(555) 555-****', product_name: 'Starter Kit' } },
            ]);
            setLoading(false);
            return;
        }

        if (authLoading) return;
        if (companyId) {
            fetchLogs();
            subscribeToLogs();
        } else {
            setLoading(false);
        }
    }, [companyId, authLoading, demoMode]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // We need to join with pharmacy_prospects (or warranty_prospects) to get names
            // Supabase client join syntax:
            const { data } = await supabase
                .from('call_logs')
                .select(`
                    *,
                    prospect:warranty_prospects (
                        customer_name,
                        phone,
                        product_name,
                        company_id
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) {
                // Filter by company_id on the client side if the RLS allows seeing others (superadmin)
                // Or lean on RLS. 
                // Since this view is "For Company Admin", RLS should filter it already.
                // But let's map it safely.
                const mapped = data.map(log => ({
                    ...log,
                    // Flatten prospect data if exists
                    prospect: Array.isArray(log.prospect) ? log.prospect[0] : log.prospect
                }));
                setLogs(mapped);
            }
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToLogs = () => {
        const subscription = supabase
            .channel('public:call_logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_logs' }, (payload) => {
                console.log('New Call Log:', payload);
                // We'd ideally need to fetch the prospect name for this new log
                // For now, insert it with placeholder or refetch
                fetchLogs(); // Brute force refresh for simplicity
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_logs' }, () => {
                fetchLogs();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    };

    const getStatusIcon = (status: string, outcome: string) => {
        if (status !== 'SUCCESS') return <XCircle className="text-red-500 w-5 h-5" />;
        if (outcome === 'sale') return <CheckCircle2 className="text-green-500 w-5 h-5" />;
        if (outcome === 'declined') return <XCircle className="text-slate-500 w-5 h-5" />;
        return <Phone className="text-blue-500 w-5 h-5" />;
    };

    if (loading) return <div className="p-12 text-center text-slate-500 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Live Call Queue</h2>
                    <p className="text-slate-400">Real-time monitoring of agent activity.</p>
                </div>
                <button onClick={fetchLogs} className="text-sm text-blue-400 hover:text-blue-300">
                    Refresh
                </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Customer</th>
                            <th className="p-4 font-semibold">Product</th>
                            <th className="p-4 font-semibold">Outcome</th>
                            <th className="p-4 font-semibold">Duration</th>
                            <th className="p-4 font-semibold text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">
                                    No calls found for this company.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        {getStatusIcon(log.connection_status, log.outcome)}
                                    </td>
                                    <td className="p-4 font-medium text-white">
                                        {log.prospect?.customer_name || 'Unknown'}
                                        <div className="text-xs text-slate-500 font-mono mt-1">
                                            {log.prospect?.phone}
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-300">
                                        {log.prospect?.product_name || '-'}
                                    </td>
                                    <td className="p-4">
                                        {log.outcome ? (
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${log.outcome === 'sale' ? 'bg-green-500/10 text-green-400' :
                                                log.outcome === 'declined' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {log.outcome}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 italic">In Progress</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-slate-400 font-mono text-sm">
                                        {log.duration || '-'}
                                    </td>
                                    <td className="p-4 text-right text-slate-500 text-sm">
                                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
