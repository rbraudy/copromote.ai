import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Building2, Globe, ArrowRight, Loader2, FileText } from 'lucide-react';
import { BundleSuggestionsModal } from './BundleSuggestionsModal';
import { CallTranscriptModal } from './CallTranscriptModal';

interface LeadsProps {
    user: any;
}

export const Leads = ({ user }: LeadsProps) => {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Bundle Modal State
    const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [selectedLeadForTranscript, setSelectedLeadForTranscript] = useState<string | null>(null);

    // Form State
    const [newLeadUrl, setNewLeadUrl] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (user) fetchLeads();
    }, [user]);

    const fetchLeads = async () => {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data || []);
        } catch (err) {
            console.error('Error fetching leads:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            let formattedUrl = newLeadUrl.trim();
            if (!formattedUrl.startsWith('http')) {
                formattedUrl = `https://${formattedUrl}`;
            }

            if (!user) throw new Error('You must be logged in');

            // 1. Create Lead
            const { data: leadData, error: leadError } = await supabase
                .from('leads')
                .insert([{
                    store_url: formattedUrl,
                    company_name: companyName,
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone: phone,
                    seller_id: user.id,
                    status: 'new'
                }])
                .select()
                .single();

            if (leadError) throw leadError;

            // 2. Trigger Ingest
            const { error: ingestError } = await supabase.functions.invoke('ingestStore', {
                body: { storeUrl: formattedUrl, leadId: leadData.id }
            });

            if (ingestError) throw ingestError;

            setNewLeadUrl('');
            setCompanyName('');
            setFirstName('');
            setLastName('');
            setEmail('');
            setPhone('');
            setIsModalOpen(false);
            fetchLeads();
            alert('Partner added successfully! Products are being imported in the background.');

        } catch (err: any) {
            alert('Error adding partner: ' + err.message);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Partners</h1>
                    <p className="text-gray-500 mt-1">Manage your copromotion partners and bundles</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    <Plus size={20} />
                    Add Partner
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
            ) : leads.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 className="text-blue-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No partners yet</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">
                        Add a partner store to start creating copromotion bundles.
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        Add First Partner
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {leads.map(lead => (
                        <div key={lead.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-gray-100 p-3 rounded-lg">
                                    <Building2 className="text-gray-600" size={24} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${lead.status === 'new' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {lead.status.toUpperCase()}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {lead.company_name || 'Unknown Company'}
                            </h3>

                            <a
                                href={lead.store_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-6"
                            >
                                <Globe size={14} />
                                {new URL(lead.store_url).hostname}
                            </a>

                            <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedLead(lead);
                                        setIsBundleModalOpen(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-medium hover:bg-blue-700 py-2 rounded-lg transition-colors"
                                >
                                    Create Promotion
                                    <ArrowRight size={16} />
                                </button>
                                {lead.status !== 'new' && (
                                    <button
                                        onClick={() => setSelectedLeadForTranscript(lead.id)}
                                        className="px-3 flex items-center justify-center border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-100 rounded-lg transition-colors"
                                        title="View Outreach History"
                                    >
                                        <FileText size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Partner Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Add New Partner</h2>
                            <p className="text-sm text-gray-500 mt-1">Enter the details of the store you want to partner with.</p>
                        </div>

                        <form onSubmit={handleAddLead} className="p-6 space-y-4">
                            <div>
                                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    name="companyName"
                                    id="companyName"
                                    placeholder="e.g. Maison Cookware"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="storeUrl" className="block text-sm font-medium text-gray-700 mb-1">Store URL</label>
                                <input
                                    type="text"
                                    name="storeUrl"
                                    id="storeUrl"
                                    placeholder="e.g. maisoncookware.com"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    value={newLeadUrl}
                                    onChange={(e) => setNewLeadUrl(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        id="firstName"
                                        placeholder="Jane"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        id="lastName"
                                        placeholder="Doe"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Contact Email (Optional)</label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    placeholder="partner@example.com"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Mobile Phone (Optional)</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    id="phone"
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 mt-6 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {isAdding ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Adding...
                                        </>
                                    ) : (
                                        'Add Partner'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bundle Suggestions Modal */}
            {selectedLead && (
                <BundleSuggestionsModal
                    isOpen={isBundleModalOpen}
                    onClose={() => setIsBundleModalOpen(false)}
                    leadId={selectedLead.id}
                    sellerId={user.id}
                    partnerName={selectedLead.company_name}
                />
            )}

            <CallTranscriptModal
                isOpen={!!selectedLeadForTranscript}
                onClose={() => setSelectedLeadForTranscript(null)}
                leadId={selectedLeadForTranscript || undefined}
            />
        </div>
    );
};
