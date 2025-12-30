import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Play, FileText, Phone, Calendar, CheckCircle, Loader2, BarChart3 } from 'lucide-react';

interface CallTranscriptModalProps {
    isOpen: boolean;
    onClose: () => void;
    prospectId?: string;
    leadId?: string;
    proposalId?: string;
}

interface CallLog {
    id: string;
    status: string;
    connection_status: 'SUCCESS' | 'FAIL' | null;
    duration: string | null;
    link_sent: boolean;
    link_clicks: number;
    communication_sent?: string;
    outcome: string;
    transcript: string;
    recording_url: string;
    created_at: string;
}

export const CallTranscriptModal: React.FC<CallTranscriptModalProps> = ({
    isOpen,
    onClose,
    prospectId,
    leadId,
    proposalId
}) => {
    const [logs, setLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchLogs();
        }
    }, [isOpen, prospectId, leadId, proposalId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('call_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (prospectId) query = query.eq('warranty_prospect_id', prospectId);
            else if (leadId) query = query.eq('lead_id', leadId);
            else if (proposalId) query = query.eq('proposal_id', proposalId);

            const { data, error } = await query;
            if (error) throw error;

            setLogs(data || []);
            if (data?.length) setSelectedLog(data[0]);
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f1113] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#0f1113] to-[#1a1c1e]">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
                            <BarChart3 className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Call Intelligence</h2>
                            <p className="text-sm text-gray-500 font-medium">Detailed behavioral analysis and interaction metrics</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all group">
                        <X className="w-6 h-6 text-gray-500 group-hover:text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Sidebar: History */}
                    <div className="w-full md:w-72 border-r border-white/5 overflow-y-auto bg-[#0f1113]">
                        <div className="p-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Contact History</div>
                        {loading ? (
                            <div className="p-12 flex justify-center">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-600 italic font-medium">No interaction history found</div>
                        ) : (
                            <div className="px-3 pb-6 space-y-1">
                                {logs.map(log => (
                                    <button
                                        key={log.id}
                                        onClick={() => setSelectedLog(log)}
                                        className={`w-full p-4 text-left rounded-2xl transition-all duration-200 group ${selectedLog?.id === log.id
                                            ? 'bg-blue-600/10 border border-blue-500/20'
                                            : 'hover:bg-white/5 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-sm font-bold ${selectedLog?.id === log.id ? 'text-white' : 'text-gray-400'}`}>
                                                {new Date(log.created_at).toLocaleDateString()}
                                            </span>
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${log.connection_status === 'SUCCESS' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {log.connection_status || 'FAIL'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3 opacity-50" />
                                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-8 bg-[#0a0c0e]">
                        {selectedLog ? (
                            <div className="space-y-10">
                                {/* Analytics Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-[#1a1c1e] p-5 rounded-2xl border border-white/5 shadow-sm">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Duration</div>
                                        <div className="text-xl font-bold text-white">{selectedLog.duration || '0s'}</div>
                                    </div>
                                    <div className="bg-[#1a1c1e] p-5 rounded-2xl border border-white/5 shadow-sm">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Status</div>
                                        <div className={`text-xl font-bold ${selectedLog.connection_status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}`}>
                                            {selectedLog.connection_status || 'FAILED'}
                                        </div>
                                    </div>
                                    <div className="bg-[#1a1c1e] p-5 rounded-2xl border border-white/5 shadow-sm">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Link Sent</div>
                                        <div className={`text-xl font-bold ${selectedLog.link_sent ? 'text-blue-400' : 'text-gray-600'}`}>
                                            {selectedLog.link_sent ? 'YES' : 'NO'}
                                        </div>
                                    </div>
                                    <div className="bg-[#1a1c1e] p-5 rounded-2xl border border-white/5 shadow-sm">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Clicks</div>
                                        <div className={`text-xl font-bold ${selectedLog.link_clicks > 0 ? 'text-green-500 animate-pulse' : 'text-gray-600'}`}>
                                            {selectedLog.link_clicks || 0}
                                        </div>
                                    </div>
                                </div>

                                {/* Outcome Section */}
                                <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-3xl p-8 shadow-xl">
                                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                        <CheckCircle className="w-4 h-4" />
                                        Summary & Sentiment
                                    </h3>
                                    <p className="text-xl text-white font-medium leading-relaxed italic">
                                        "{selectedLog.outcome || 'The AI is still processing the final outcome of this conversation...'}"
                                    </p>
                                    {selectedLog.communication_sent && (
                                        <div className="mt-6 pt-6 border-t border-white/5">
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Initial Outreach</div>
                                            <div className="text-sm text-gray-400 font-medium font-mono">{selectedLog.communication_sent}</div>
                                        </div>
                                    )}
                                </div>

                                {/* Transcript */}
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-purple-400" />
                                            Conversation Transcript
                                        </h3>
                                        {selectedLog.recording_url && (
                                            <a
                                                href={selectedLog.recording_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all text-sm font-bold text-white border border-white/5"
                                            >
                                                <Play className="w-4 h-4" />
                                                Listen to Recording
                                            </a>
                                        )}
                                    </div>
                                    <div className="bg-[#1a1c1e] border border-white/5 rounded-3xl p-8 whitespace-pre-wrap text-gray-300 font-medium leading-loose shadow-inner">
                                        {selectedLog.transcript || "Conversation details are being synthesized. Please check back in a few moments."}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-6">
                                <div className="bg-white/5 p-8 rounded-full">
                                    <Phone className="w-16 h-16 opacity-10" />
                                </div>
                                <p className="text-lg font-bold tracking-tight">Select an interaction for analysis</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
