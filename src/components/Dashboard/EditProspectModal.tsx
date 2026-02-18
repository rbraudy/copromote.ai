import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Package, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Prospect {
    id: string;
    customer_name: string;
    customer_first_name?: string;
    customer_last_name?: string;
    phone: string;
    product_name: string;
}

interface EditProspectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    prospect: Prospect | null;
}

export const EditProspectModal: React.FC<EditProspectModalProps> = ({ isOpen, onClose, onSuccess, prospect }) => {
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_first_name: '',
        customer_last_name: '',
        phone: '',
        product_name: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (prospect) {
            setFormData({
                customer_name: prospect.customer_name || '',
                customer_first_name: (prospect as any).customer_first_name || '',
                customer_last_name: (prospect as any).customer_last_name || '',
                phone: prospect.phone || '',
                product_name: prospect.product_name || ''
            });
        }
    }, [prospect]);

    if (!isOpen || !prospect) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('warranty_prospects')
                .update({
                    customer_name: formData.customer_name,
                    customer_first_name: formData.customer_first_name,
                    customer_last_name: formData.customer_last_name,
                    phone: formData.phone.replace(/[^\d+]/g, ''),
                    product_name: formData.product_name
                })
                .eq('id', prospect.id);

            if (updateError) throw updateError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating prospect:', err);
            setError(err.message || 'Failed to update prospect.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <form onSubmit={handleSubmit} className="p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-blue-500/10 rounded-2xl">
                            <Save className="w-8 h-8 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Quick Edit</h2>
                            <p className="text-slate-400 text-sm">Update customer details</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                                <User size={14} />
                                Customer Name
                            </label>
                            <input
                                type="text"
                                value={formData.customer_name}
                                onChange={(e) => {
                                    const newName = e.target.value;
                                    setFormData(prev => {
                                        const parts = newName.split(' ');
                                        return {
                                            ...prev,
                                            customer_name: newName,
                                            // Auto-populate if currently empty
                                            customer_first_name: prev.customer_first_name || parts[0],
                                            customer_last_name: prev.customer_last_name || (parts.length > 1 ? parts[parts.length - 1] : '')
                                        };
                                    });
                                }}
                                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Display Name / Full Name"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                                    <User size={14} className="text-blue-400" />
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.customer_first_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, customer_first_name: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    placeholder="AI will call them this"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                                    <User size={14} className="text-slate-500" />
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.customer_last_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, customer_last_name: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    placeholder="Last Name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                                <Phone size={14} />
                                Phone Number
                            </label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                                <Package size={14} />
                                Product
                            </label>
                            <input
                                type="text"
                                value={formData.product_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="mt-10 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-2xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
