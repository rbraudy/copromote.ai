import React, { useState, useEffect } from 'react';
import { Clock, PhoneCall, Loader2, FileText, AlertCircle, PlayCircle, Upload, LayoutDashboard, BarChart3, TrendingUp, CheckCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { User } from 'firebase/auth';
import { CallTranscriptModal } from './CallTranscriptModal';
import { DemoCallModal } from './DemoCallModal';
import { ImportProspectsModal } from './ImportProspectsModal';
import { Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'new': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case 'called': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        case 'enrolled': return 'bg-green-500/10 text-green-400 border-green-500/20';
        case 'declined': return 'bg-red-500/10 text-red-400 border-red-500/20';
        default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
};

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1']; // Sale, Voicemail/Other, Issue/Fail, Enrolled

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
        outcome?: string;
    };
}

export const WarrantyDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'prospects' | 'analytics'>('prospects');
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [callingId, setCallingId] = useState<string | null>(null);
    const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
    const [isDemoOpen, setIsDemoOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Analytics Data
    const [stats, setStats] = useState({
        totalCalls: 0,
        sales: 0,
        issues: 0,
        conversionRate: 0,
        outcomeData: [] as any[]
    });

    useEffect(() => {
        if (user) fetchProspects();
    }, [user, activeTab]); // Refresh when tab changes to Ensure logic runs if needed

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
                        outcome,
                        created_at
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedProspects = (data || []).map((p: any) => ({
                ...p,
                latest_call: p.call_logs?.sort((a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0]
            }));

            setProspects(mappedProspects);
            calculateAnalytics(mappedProspects);

        } catch (error) {
            console.error('Error fetching prospects:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateAnalytics = (data: Prospect[]) => {
        let totalCalls = 0;
        let sales = 0;
        let issues = 0;
        let others = 0;

        data.forEach(p => {
            if (p.latest_call) {
                totalCalls++;
                const outcome = p.latest_call.outcome || 'completed';
                if (outcome === 'sale' || p.latest_call.link_sent) sales++;
                else if (outcome === 'issue') issues++;
                else others++;
            }
        });

        setStats({
            totalCalls,
            sales,
            issues,
            conversionRate: totalCalls > 0 ? Math.round((sales / totalCalls) * 100) : 0,
            outcomeData: [
                { name: 'Sales', value: sales },
                { name: 'Issues', value: issues },
                { name: 'Completed/Voice', value: others }
            ]
        });
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === prospects.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(prospects.map(p => p.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.size) return;

        if (confirm(`Are you sure you want to delete ${selectedIds.size} prospects?`)) {
            const { error } = await supabase
                .from('warranty_prospects')
                .delete()
                .in('id', Array.from(selectedIds));

            if (!error) {
                setSelectedIds(new Set());
                fetchProspects();
            }
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
            if (data && !data.success) {
                throw new Error(data.error || 'Call failed to initiate');
            }
            if (data?.warning) {
                alert(`Warning: Call started but DB Log failed: ${data.warning}`);
            }

            await fetchProspects();
        } catch (error: any) {
            console.error('Call failed:', error);
            alert(`Call failed: ${error.message}`);
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

                <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700">
                    <button
                        onClick={() => setActiveTab('prospects')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'prospects'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <LayoutDashboard size={16} />
                        Prospects
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'analytics'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <BarChart3 size={16} />
                        Analytics
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {/* Buttons moved to header but can stay here or be context sensitive. Keeping them simple. */}
                    {activeTab === 'prospects' && (
                        <>
                            {selectedIds.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-red-500/20 animate-in fade-in"
                                >
                                    <Trash2 size={18} />
                                    Delete ({selectedIds.size})
                                </button>
                            )}
                            <button
                                onClick={() => setIsImportOpen(true)}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-white/10"
                            >
                                <Upload size={18} className="text-blue-400" />
                                Import CSV
                            </button>
                            <button
                                onClick={() => setIsDemoOpen(true)}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-white/10"
                            >
                                <PlayCircle size={18} className="text-blue-400" />
                                Test Demo Call
                            </button>
                        </>
                    )}
                </div>
            </div>

            {activeTab === 'analytics' ? (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                                    <PhoneCall size={24} />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Total Calls</p>
                                    <h3 className="text-3xl font-bold text-white">{stats.totalCalls}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Sales / Pitched</p>
                                    <h3 className="text-3xl font-bold text-white">{stats.sales}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Issues Reported</p>
                                    <h3 className="text-3xl font-bold text-white">{stats.issues}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">Conversion Rate</p>
                                    <h3 className="text-3xl font-bold text-white">{stats.conversionRate}%</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-[400px]">
                            <h3 className="text-lg font-bold text-white mb-6">Call Outcomes</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.outcomeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.outcomeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-[400px] flex items-center justify-center">
                            <div className="text-center">
                                <BarChart3 size={48} className="text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-400">More analytics (Trends, Time of Day) coming soon!</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <ImportProspectsModal
                        isOpen={isImportOpen}
                        onClose={() => setIsImportOpen(false)}
                        onSuccess={() => {
                            setIsImportOpen(false);
                            fetchProspects();
                        }}
                        user={user}
                    />

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-800/50 text-slate-300 text-xs uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="px-4 py-4 w-12">
                                            <input
                                                type="checkbox"
                                                checked={prospects.length > 0 && selectedIds.size === prospects.length}
                                                onChange={toggleSelectAll}
                                                className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500/50"
                                            />
                                        </th>
                                        <th className="px-4 py-4">Customer</th>
                                        <th className="px-4 py-4">Product</th>
                                        <th className="px-4 py-4">Purchase Date</th>
                                        <th className="px-4 py-4 text-center">Attempts</th>
                                        <th className="px-4 py-4">Connection</th>
                                        <th className="px-4 py-4">Duration</th>
                                        <th className="px-4 py-4">SMS Sent</th>
                                        <th className="px-4 py-4 text-center">Clicks</th>
                                        <th className="px-4 py-4">Status</th>
                                        <th className="px-4 py-4 text-right sticky right-0 bg-slate-900 z-10 shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.5)]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {prospects.map((prospect) => (
                                        <tr key={prospect.id} className={`transition-all duration-200 ${selectedIds.has(prospect.id) ? 'bg-blue-500/5 hover:bg-blue-500/10' : 'hover:bg-slate-800/30'}`}>
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(prospect.id)}
                                                    onChange={() => toggleSelection(prospect.id)}
                                                    className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500/50"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm font-bold text-white">{prospect.customer_name}</div>
                                                <div className="text-xs text-slate-500 font-mono tracking-tight">{prospect.phone}</div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-300 max-w-[200px] truncate" title={prospect.product_name}>
                                                {prospect.product_name}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                                                {new Date(prospect.purchase_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-blue-400">
                                                {prospect.call_attempts || 0}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                {prospect.latest_call?.connection_status === 'SUCCESS' ? (
                                                    <span className="px-2 py-0.5 text-[10px] font-black rounded bg-green-500/10 text-green-400 border border-green-500/20">SUCCESS</span>
                                                ) : prospect.latest_call?.connection_status === 'FAIL' ? (
                                                    <span className="px-2 py-0.5 text-[10px] font-black rounded bg-red-500/10 text-red-400 border border-red-500/20">FAIL</span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-600 font-medium">NO CALL</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-400 font-medium">
                                                {prospect.latest_call?.duration || '-'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-xs">
                                                {prospect.latest_call?.link_sent ? (
                                                    <span className="text-blue-400 font-bold">SENT</span>
                                                ) : (
                                                    <span className="text-slate-700">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                                                {(prospect.latest_call?.link_clicks ?? 0) > 0 ? (
                                                    <span className="text-green-500 font-black animate-pulse">{prospect.latest_call?.link_clicks}</span>
                                                ) : (
                                                    <span className="text-slate-600">0</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${getStatusColor(prospect.status)}`}>
                                                    {prospect.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right sticky right-0 bg-slate-900 border-l border-slate-800 shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.5)]">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Are you sure you want to delete this prospect?')) {
                                                                const { error } = await supabase.from('warranty_prospects').delete().eq('id', prospect.id);
                                                                if (!error) fetchProspects();
                                                            }
                                                        }}
                                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                                                        title="Delete Prospect"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    {prospect.status !== 'new' && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedProspectId(prospect.id);
                                                                setIsTranscriptOpen(true);
                                                            }}
                                                            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                                                            title="View Full Call Analytics"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleCall(prospect)}
                                                        disabled={callingId !== null}
                                                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all active:scale-90 shadow-lg shadow-blue-500/20"
                                                    >
                                                        {callingId === prospect.id ? <Loader2 size={14} className="animate-spin" /> : <PhoneCall size={14} />}
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
                                <button
                                    onClick={() => setIsDemoOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                                >
                                    <PlayCircle size={20} />
                                    Start a Demo Call
                                </button>
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

                    <DemoCallModal
                        isOpen={isDemoOpen}
                        onClose={() => setIsDemoOpen(false)}
                    />
                </>
            )}
        </div>
    );
};

