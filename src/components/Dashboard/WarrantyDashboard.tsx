import React, { useState, useEffect } from 'react';
import { Clock, PhoneCall, Loader2, FileText, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { User } from 'firebase/auth';
import { CallTranscriptModal } from './CallTranscriptModal';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'new': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case 'called': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        case 'enrolled': return 'bg-green-500/10 text-green-400 border-green-500/20';
        case 'declined': return 'bg-red-500/10 text-red-400 border-red-500/20';
        default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
};

interface Prospect {
    id: string;
    customer_name: string;
    phone: string;
    product_name: string;
    purchase_date: string;
    expiry_date: string;
    status: 'new' | 'called' | 'enrolled' | 'declined';
    call_attempts?: number;
    latest_call?: {
        connection_status: 'SUCCESS' | 'FAIL' | null;
        duration: string | null;
        link_sent: boolean;
        link_clicks: number;
    };
}

export const WarrantyDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [callingId, setCallingId] = useState<string | null>(null);
    const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
    const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);

    useEffect(() => {
        if (user) fetchProspects();
    }, [user]);

    const fetchProspects = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('warranty_prospects')
                .select(`
                    *,
                    call_logs (
                        connection_status,
                        duration,
                        link_sent,
                        link_clicks,
                        created_at
                    )
                `)
                .eq('seller_id', user.uid)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedProspects = (data || []).map((p: any) => ({
                ...p,
                latest_call: p.call_logs?.sort((a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0]
            }));

            setProspects(mappedProspects);
        } catch (error) {
            console.error('Error fetching prospects:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCall = async (prospect: Prospect) => {
        if (!prospect.phone) return;
        setCallingId(prospect.id);

        try {
            const { data, error } = await supabase.functions.invoke('make-warranty-call-v2', {
                body: {
                    prospectId: prospect.id,
                    phone: prospect.phone,
                    customerName: prospect.customer_name,
                    productName: prospect.product_name,
                    purchaseDate: prospect.purchase_date
                }
            });

            if (error) throw error;

            await fetchProspects();
        } catch (error) {
            console.error('Call failed:', error);
        } finally {
            setCallingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-500" size={40} />
                    <p className="text-slate-400 font-medium">Loading warranty insights...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Clock className="text-blue-500" size={28} />
                        Warranty Dashboard
                    </h1>
                    <p className="text-slate-400 mt-1">Real-time tracking of AI outreach and conversion</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-800/50 text-slate-300 text-xs uppercase tracking-wider font-bold">
                            <tr>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Purchase Date</th>
                                <th className="px-6 py-4 text-center">Attempts</th>
                                <th className="px-6 py-4">Connection</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4">SMS Sent</th>
                                <th className="px-6 py-4 text-center">Clicks</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {prospects.map((prospect) => (
                                <tr key={prospect.id} className="hover:bg-slate-800/30 transition-all duration-200">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-white">{prospect.customer_name}</div>
                                        <div className="text-xs text-slate-500 font-mono tracking-tight">{prospect.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {prospect.product_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                        {new Date(prospect.purchase_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-blue-400">
                                        {prospect.call_attempts || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {prospect.latest_call?.connection_status === 'SUCCESS' ? (
                                            <span className="px-2 py-0.5 text-[10px] font-black rounded bg-green-500/10 text-green-400 border border-green-500/20">SUCCESS</span>
                                        ) : prospect.latest_call?.connection_status === 'FAIL' ? (
                                            <span className="px-2 py-0.5 text-[10px] font-black rounded bg-red-500/10 text-red-400 border border-red-500/20">FAIL</span>
                                        ) : (
                                            <span className="text-[10px] text-slate-600 font-medium">NO CALL</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-medium">
                                        {prospect.latest_call?.duration || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                                        {prospect.latest_call?.link_sent ? (
                                            <span className="text-blue-400 font-bold">SENT</span>
                                        ) : (
                                            <span className="text-slate-700">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                        {(prospect.latest_call?.link_clicks ?? 0) > 0 ? (
                                            <span className="text-green-500 font-black animate-pulse">{prospect.latest_call?.link_clicks}</span>
                                        ) : (
                                            <span className="text-slate-600">0</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${getStatusColor(prospect.status)}`}>
                                            {prospect.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            {prospect.status !== 'new' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedProspectId(prospect.id);
                                                        setIsTranscriptOpen(true);
                                                    }}
                                                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                                                    title="View Full Call Analytics"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleCall(prospect)}
                                                disabled={callingId !== null}
                                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white px-5 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all active:scale-90 shadow-lg shadow-blue-500/20"
                                            >
                                                {callingId === prospect.id ? <Loader2 size={16} className="animate-spin" /> : <PhoneCall size={16} />}
                                                DIAL
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {prospects.length === 0 && (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                        <AlertCircle className="text-slate-700" size={48} />
                        <p className="text-slate-500 italic max-w-xs text-sm">No warranty prospects found in your sales history yet.</p>
                    </div>
                )}
            </div>

            <CallTranscriptModal
                isOpen={isTranscriptOpen}
                onClose={() => {
                    setIsTranscriptOpen(false);
                    setSelectedProspectId(null);
                }}
                prospectId={selectedProspectId || ''}
            />
        </div>
    );
};
