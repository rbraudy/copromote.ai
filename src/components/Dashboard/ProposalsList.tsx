import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, ExternalLink, Trash2, Edit, Check, Search, Loader2, Share2 } from 'lucide-react';
import { ProposalDetail } from './ProposalDetail';
import { ShareProposalModal } from './ShareProposalModal';

interface ProposalsListProps {
    user: any;
}

export const ProposalsList = ({ user }: ProposalsListProps) => {
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProposal, setSelectedProposal] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedPartners, setExpandedPartners] = useState<string[]>([]);

    const [selectedProposalIds, setSelectedProposalIds] = useState<Set<string>>(new Set());

    // Share Modal State
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareLead, setShareLead] = useState<any>(null);

    useEffect(() => {
        if (user) fetchProposals();
    }, [user]);

    const fetchProposals = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch proposals with lead details
            const { data, error } = await supabase
                .from('copromotions')
                .select(`
                    *,
                    leads (
                        id,
                        company_name,
                        store_url,
                        email,
                        phone,
                        first_name,
                        last_name
                    )

                `)
                .eq('seller_id', user.uid)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProposals(data || []);
        } catch (err: any) {
            console.error('Error fetching proposals:', err);
            setError(err.message || 'Failed to load proposals');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this proposal?')) return;
        try {
            const { error } = await supabase
                .from('copromotions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setProposals(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error('Error deleting proposal:', err);
            alert('Failed to delete proposal');
        }
    };

    const togglePartnerExpand = (leadId: string) => {
        setExpandedPartners(prev =>
            prev.includes(leadId)
                ? prev.filter(id => id !== leadId)
                : [...prev, leadId]
        );
    };

    const toggleProposalSelection = (id: string) => {
        setSelectedProposalIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Filter proposals first
    const filteredProposals = proposals.filter(p =>
        p.offer_details?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.offer_details?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.leads?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group proposals by Partner (Lead)
    const groupedProposals = filteredProposals.reduce((acc, proposal) => {
        const leadId = proposal.leads?.id || 'unknown';
        if (!acc[leadId]) {
            acc[leadId] = {
                lead: proposal.leads,
                items: []
            };
        }
        acc[leadId].items.push(proposal);
        return acc;
    }, {} as Record<string, { lead: any, items: any[] }>);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 bg-red-50 rounded-lg border border-red-100">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                    onClick={fetchProposals}
                    className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (proposals.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="text-purple-600" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No proposals yet</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                    Create your first proposal from the Partners tab.
                </p>
                <button
                    onClick={fetchProposals}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                    Refresh List
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header & Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                        <FileText className="text-blue-600" size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Active Proposals</h3>
                        <p className="text-sm text-gray-500">Manage your sent and draft proposals</p>
                    </div>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search proposals..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
                    />
                </div>
            </div>

            {/* Partners Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {(Object.values(groupedProposals) as { lead: any, items: any[] }[]).map(({ lead, items }) => {
                    const isExpanded = expandedPartners.includes(lead?.id || 'unknown');
                    const hasMore = items.length > 1;
                    const displayItems = isExpanded ? items : [items[0]];

                    return (
                        <div
                            key={lead?.id || 'unknown'}
                            className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 ${isExpanded ? 'xl:col-span-3 md:col-span-2' : 'col-span-1'}`}
                        >
                            {/* Partner Header */}
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{lead?.company_name || 'Unknown Partner'}</h3>
                                    <a href={lead?.store_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1">
                                        {lead?.store_url} <ExternalLink size={12} />
                                    </a>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setShareLead(lead);
                                            setShareModalOpen(true);
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <Share2 size={16} />
                                        Share
                                    </button>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="p-6">
                                <div className={`grid gap-6 ${isExpanded ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                                    {displayItems.map((proposal: any) => {
                                        const isSelected = selectedProposalIds.has(proposal.id);
                                        return (
                                            <div key={proposal.id} className={`group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${!isExpanded && 'w-full'}`}>
                                                {/* Card Image */}
                                                <div className="relative h-48 bg-gray-900 overflow-hidden">
                                                    {proposal.marketing_assets?.vignettes?.[0] ? (
                                                        <img
                                                            src={proposal.marketing_assets.vignettes[0]}
                                                            alt={proposal.offer_details?.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-100">
                                                            <FileText size={32} className="opacity-20" />
                                                        </div>
                                                    )}

                                                    {/* Selection Checkbox */}
                                                    <div
                                                        className="absolute top-3 left-3 z-10 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleProposalSelection(proposal.id);
                                                        }}
                                                    >
                                                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${isSelected
                                                            ? 'bg-blue-600 border-blue-600'
                                                            : 'bg-white/90 border-gray-300 hover:border-blue-400'
                                                            }`}>
                                                            {isSelected && <Check size={14} className="text-white" />}
                                                        </div>
                                                    </div>

                                                    {/* Status Badge */}
                                                    <div className="absolute top-3 right-3">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${proposal.status === 'accepted' ? 'bg-green-100 text-green-700 border-green-200' :
                                                            proposal.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                proposal.status === 'sent' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                    'bg-white/90 text-gray-600 border-gray-200 backdrop-blur-sm'
                                                            }`}>
                                                            {proposal.status}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Card Content */}
                                                <div className="p-5 flex-1 flex flex-col">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-gray-900 line-clamp-1 flex-1 mr-2" title={proposal.offer_details?.title}>
                                                            {proposal.offer_details?.title || 'Untitled Bundle'}
                                                        </h4>
                                                    </div>

                                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                                                        {proposal.offer_details?.description}
                                                    </p>

                                                    {/* Stats Grid */}
                                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                            <span className="block text-[10px] uppercase font-bold text-gray-400">Discount</span>
                                                            <span className="text-sm font-bold text-gray-900">{proposal.offer_details?.discount}%</span>
                                                        </div>
                                                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                            <span className="block text-[10px] uppercase font-bold text-gray-400">MOQ</span>
                                                            <span className="text-sm font-bold text-gray-900">{proposal.offer_details?.moq}</span>
                                                        </div>
                                                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                            <span className="block text-[10px] uppercase font-bold text-gray-400">Days</span>
                                                            <span className="text-sm font-bold text-gray-900">{proposal.offer_details?.duration || 30}</span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedProposal(proposal);
                                                                setIsDetailOpen(true);
                                                            }}
                                                            className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <Edit size={14} />
                                                            Edit Proposal
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(proposal.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Expand/Collapse Trigger */}
                                    {!isExpanded && hasMore && (
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={() => togglePartnerExpand(lead?.id || 'unknown')}
                                                className="flex flex-col items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors group p-4"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                                                    <span className="text-2xl font-light text-gray-400 group-hover:text-blue-500">+</span>
                                                </div>
                                                <span className="font-medium text-sm">{items.length - 1} More</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isExpanded && (
                                    <div className="mt-6 flex justify-center border-t border-gray-100 pt-4">
                                        <button
                                            onClick={() => togglePartnerExpand(lead?.id || 'unknown')}
                                            className="text-sm text-gray-500 hover:text-gray-900 font-medium flex items-center gap-2"
                                        >
                                            Show Less
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedProposal && (
                <ProposalDetail
                    isOpen={isDetailOpen}
                    onClose={() => {
                        setIsDetailOpen(false);
                        setSelectedProposal(null);
                    }}
                    proposal={selectedProposal}
                    onUpdate={() => {
                        fetchProposals();
                        setIsDetailOpen(false);
                    }}
                />
            )}

            {shareLead && (
                <ShareProposalModal
                    isOpen={shareModalOpen}
                    onClose={() => {
                        setShareModalOpen(false);
                        setShareLead(null);
                    }}
                    lead={shareLead}
                    onUpdate={fetchProposals}
                    initialSelectedIds={selectedProposalIds}
                />
            )}
        </div>
    );
};
