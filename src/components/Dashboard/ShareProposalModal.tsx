import { useState, useEffect } from 'react';
import { X, Copy, Mail, MessageSquare, Check, Save, Loader2, Image as ImageIcon, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
interface ShareProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
    onUpdate: () => void;
    initialSelectedIds?: Set<string>;
}

export const ShareProposalModal = ({ isOpen, onClose, lead, onUpdate, initialSelectedIds }: ShareProposalModalProps) => {
    const [firstName, setFirstName] = useState(lead?.first_name || '');
    const [lastName, setLastName] = useState(lead?.last_name || '');
    const [email, setEmail] = useState(lead?.email || '');
    const [phone, setPhone] = useState(lead?.phone || '');
    const [isSaving, setIsSaving] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [isCalling, setIsCalling] = useState(false);

    // Selection State
    const [proposals, setProposals] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoadingProposals, setIsLoadingProposals] = useState(false);

    useEffect(() => {
        if (lead) {
            setFirstName(lead.first_name || '');
            setLastName(lead.last_name || '');
            setEmail(lead.email || '');
            setPhone(lead.phone || '');
            fetchProposals();
        }
    }, [lead]);

    const fetchProposals = async () => {
        setIsLoadingProposals(true);
        try {
            const { data, error } = await supabase
                .from('copromotions')
                .select('*')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setProposals(data || []);
            // Pre-select proposals that are already sent or accepted
            const preSelected = new Set(
                (data || [])
                    .filter((p: any) => p.status === 'sent' || p.status === 'accepted')
                    .map((p: any) => p.id)
            );

            // Add initial selections from props
            if (initialSelectedIds) {
                initialSelectedIds.forEach(id => preSelected.add(id));
            }

            // If none are sent AND no initial selection, select all by default
            if (preSelected.size === 0 && data && data.length > 0) {
                data.forEach((p: any) => preSelected.add(p.id));
            }
            setSelectedIds(preSelected);
        } catch (err) {
            console.error('Error fetching proposals:', err);
        } finally {
            setIsLoadingProposals(false);
        }
    };

    if (!isOpen || !lead) return null;

    const shareUrl = `${window.location.origin}/partner/${lead.id}`;

    const handleSaveContact = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('leads')
                .update({
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    phone
                })
                .eq('id', lead.id);

            if (error) throw error;
            onUpdate(); // Refresh parent list
            alert('Contact info updated!');
        } catch (err) {
            console.error('Error updating contact:', err);
            alert('Failed to update contact info');
        } finally {
            setIsSaving(false);
        }
    };

    const updateProposalStatuses = async () => {
        try {
            // 1. Set Selected to 'sent' (if they were 'new' or 'draft')
            // We don't want to revert 'accepted' back to 'sent', so we check status.
            // Actually, simplest is to just ensure they are visible.
            // But we also want to HIDE unselected ones.

            const updates = proposals.map(p => {
                const isSelected = selectedIds.has(p.id);
                if (isSelected) {
                    // If selected and currently hidden (new/draft), make it sent.
                    // If already sent/accepted, leave it.
                    if (p.status === 'new' || p.status === 'draft') return { id: p.id, status: 'sent' };
                } else {
                    // If unselected and currently visible (sent), hide it (draft).
                    // If accepted, maybe don't hide it? Or warn? For now, let's assume we can un-share sent items.
                    if (p.status === 'sent') return { id: p.id, status: 'draft' };
                }
                return null;
            }).filter(Boolean);

            if (updates.length > 0) {
                for (const update of updates) {
                    await supabase
                        .from('copromotions')
                        .update({ status: update!.status })
                        .eq('id', update!.id);
                }
                onUpdate(); // Refresh parent list
                fetchProposals(); // Refresh local list
            }
        } catch (err) {
            console.error('Error updating proposal statuses:', err);
        }
    };

    const handleAction = async (action: () => void) => {
        await updateProposalStatuses();
        action();
    };

    const handleCopyLink = () => {
        handleAction(() => {
            navigator.clipboard.writeText(shareUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        });
    };

    const handleCall = async () => {
        if (!phone) {
            alert('Please enter a phone number first.');
            return;
        }

        // 1. Save contact info if changed
        if (hasChanges) {
            await handleSaveContact();
        }

        // 2. Get the first selected proposal to pitch
        const firstSelectedId = Array.from(selectedIds)[0];
        const proposalToPitch = proposals.find(p => p.id === firstSelectedId);

        if (!proposalToPitch) return;

        if (!confirm(`Call ${lead.company_name} about "${proposalToPitch.offer_details.title}"?`)) return;

        setIsCalling(true);
        try {
            const { data, error } = await supabase.functions.invoke('make-call-v2', {
                body: {
                    leadId: lead.id,
                    proposalId: proposalToPitch.id,
                    shareUrl: shareUrl
                }
            });

            if (error) throw error;
            if (data && data.error) throw new Error(data.error);

            alert('Call initiated! The AI agent is dialing now.');
            onUpdate(); // Refresh to show call status if needed
        } catch (err: any) {
            console.error('Error making call:', err);
            alert(`Failed to start call: ${err.message}`);
        } finally {
            setIsCalling(false);
        }
    };

    const handleEmail = () => {
        handleAction(() => {
            const subject = `Partnership Proposal for ${lead.company_name}`;
            const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
            const body = `${greeting}\n\nIt was great speaking with you. I've put together some promotional bundles ideas that pair products from your catalog and ours. You can view the details and approve it here:\n\n${shareUrl}`;
            window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
        });
    };

    const handleText = () => {
        handleAction(() => {
            const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
            const body = `${greeting} I've created a partnership proposal for ${lead.company_name}. Check it out here: ${shareUrl}`;
            window.open(`sms:${phone}?body=${encodeURIComponent(body)}`);
        });
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const hasChanges =
        firstName !== (lead.first_name || '') ||
        lastName !== (lead.last_name || '') ||
        email !== (lead.email || '') ||
        phone !== (lead.phone || '');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Share Promotions</h2>
                        <p className="text-sm text-gray-500">Select the promotions you want to share with {lead.company_name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Selection Grid */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Select Promotions to Share</h3>
                        {isLoadingProposals ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-blue-600" size={24} />
                            </div>
                        ) : proposals.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                No promotions found. Create one first!
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {proposals.map((p) => {
                                    const isSelected = selectedIds.has(p.id);
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => toggleSelection(p.id)}
                                            className={`relative group cursor-pointer border-2 rounded-xl p-3 transition-all ${isSelected
                                                ? 'border-blue-600 bg-blue-50/30'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                    {p.marketing_assets?.vignettes?.[0] ? (
                                                        <img
                                                            src={p.marketing_assets.vignettes[0]}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <ImageIcon size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-gray-900 truncate pr-6">
                                                        {p.offer_details?.title || 'Untitled Bundle'}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1 text-sm">
                                                        <span className="font-bold text-gray-900">
                                                            ${p.offer_details?.promotion_price?.toFixed(2)}
                                                        </span>
                                                        <span className="text-gray-500 line-through text-xs">
                                                            ${p.offer_details?.original_price?.toFixed(2)}
                                                        </span>
                                                        <span className="text-green-600 text-xs font-medium bg-green-100 px-1.5 py-0.5 rounded">
                                                            {p.offer_details?.discount}% OFF
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Checkbox Badge */}
                                            <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected
                                                ? 'bg-blue-600 border-blue-600'
                                                : 'bg-white border-gray-300 group-hover:border-gray-400'
                                                }`}>
                                                {isSelected && <Check size={12} className="text-white" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Contact Info Section */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Partner Contact Info</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                                    placeholder="Jane"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                                placeholder="partner@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>

                        {hasChanges && (
                            <button
                                onClick={handleSaveContact}
                                disabled={isSaving}
                                className="w-full flex items-center justify-center gap-2 bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                Save Contact Info
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-white">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleCopyLink}
                            disabled={selectedIds.size === 0}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {copiedLink ? <Check className="text-green-600" size={24} /> : <Copy className="text-gray-600 group-hover:text-blue-600" size={24} />}
                            <span className="text-sm font-medium text-gray-900">Copy Link</span>
                        </button>

                        <button
                            onClick={handleCall}
                            disabled={!phone || selectedIds.size === 0 || isCalling}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!phone ? "Add phone above to call" : ""}
                        >
                            {isCalling ? <Loader2 className="animate-spin text-purple-600" size={24} /> : <Phone className="text-gray-600 group-hover:text-purple-600" size={24} />}
                            <span className="text-sm font-medium text-gray-900">AI Pitch</span>
                        </button>

                        <button
                            onClick={handleEmail}
                            disabled={!email || selectedIds.size === 0}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!email ? "Add email above to send" : ""}
                        >
                            <Mail className="text-gray-600 group-hover:text-blue-600" size={24} />
                            <span className="text-sm font-medium text-gray-900">Email</span>
                        </button>

                        <button
                            onClick={handleText}
                            disabled={!phone || selectedIds.size === 0}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!phone ? "Add phone above to send" : ""}
                        >
                            <MessageSquare className="text-gray-600 group-hover:text-blue-600" size={24} />
                            <span className="text-sm font-medium text-gray-900">Text</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
