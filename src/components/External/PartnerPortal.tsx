import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Check, X, Loader2, ShoppingBag } from 'lucide-react';

export const PartnerPortal = () => {
    const { leadId } = useParams<{ leadId: string }>();
    const [lead, setLead] = useState<any>(null);
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (leadId) fetchPortalData();
    }, [leadId]);

    const fetchPortalData = async () => {
        try {
            // 1. Fetch Lead Details (Partner)
            const { data: leadData, error: leadError } = await supabase
                .from('leads')
                .select('company_name, store_url')
                .eq('id', leadId)
                .single();

            if (leadError) throw leadError;
            setLead(leadData);

            // 2. Fetch Sent Proposals
            const { data: proposalData, error: proposalError } = await supabase
                .from('copromotions')
                .select('*')
                .eq('lead_id', leadId)
                .eq('status', 'sent') // Only show sent proposals
                .order('created_at', { ascending: false });

            if (proposalError) throw proposalError;
            setProposals(proposalData || []);

        } catch (err: any) {
            console.error('Error loading portal:', err);
            setError('Failed to load proposals. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (proposalId: string, newStatus: 'accepted' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('copromotions')
                .update({ status: newStatus })
                .eq('id', proposalId);

            if (error) throw error;

            // Update local state
            setProposals(prev => prev.filter(p => p.id !== proposalId));
            alert(`Proposal ${newStatus} successfully!`);
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Action failed. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    if (error || !lead) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md">
                    <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="text-red-600" size={32} />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-500">{error || 'Partner not found.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-lg">
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">CoPromote</h1>
                            <p className="text-xs text-gray-500">Partner Portal for <span className="font-medium text-gray-900">{lead.company_name}</span></p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
                        Curated Copromotion Offers
                    </h2>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                        We've selected these bundles specifically for your audience. Review the offers below and accept the ones you'd like to launch.
                    </p>
                </div>

                {proposals.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-lg">No active proposals found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {proposals.map((proposal) => (
                            <div key={proposal.id} className="bg-transparent flex flex-col">
                                {/* Visual Header (Taller & Full Bleed) */}
                                <div className="relative h-[500px] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                                    {proposal.marketing_assets?.vignettes?.[0] ? (
                                        <img
                                            src={proposal.marketing_assets.vignettes[0]}
                                            alt="Bundle Preview"
                                            className="w-full h-full object-cover opacity-90"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                                            No Image Available
                                        </div>
                                    )}

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none" />

                                    {/* Title Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-8 pb-24 text-white">
                                        <h3 className="text-3xl font-bold mb-2 leading-tight shadow-sm">{proposal.offer_details?.title}</h3>
                                        <p className="text-white/90 text-lg line-clamp-3 font-light">{proposal.offer_details?.description}</p>
                                    </div>
                                </div>

                                {/* Overlapping Content Card */}
                                <div className="relative -mt-16 mx-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-100 z-10 flex flex-col gap-6">

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                                            <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Discount</span>
                                            <span className="text-xl font-black text-blue-600">{proposal.offer_details?.discount}%</span>
                                        </div>
                                        <div className="bg-purple-50 rounded-xl p-3 text-center">
                                            <span className="block text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">MOQ</span>
                                            <span className="text-xl font-black text-purple-600">{proposal.offer_details?.moq}</span>
                                        </div>
                                        <div className="bg-green-50 rounded-xl p-3 text-center">
                                            <span className="block text-[10px] font-bold text-green-400 uppercase tracking-wider mb-1">Duration</span>
                                            <span className="text-xl font-black text-green-600">{proposal.offer_details?.duration}d</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleUpdateStatus(proposal.id, 'rejected')}
                                            className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            <X size={18} />
                                            Pass
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(proposal.id, 'accepted')}
                                            className="flex-[2] py-3 px-4 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm"
                                        >
                                            <Check size={18} />
                                            Accept Offer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};
