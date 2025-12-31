import React, { useState } from 'react';
import { X, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DemoCallModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DemoCallModal: React.FC<DemoCallModalProps> = ({ isOpen, onClose }) => {
    const [phone, setPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [isCalling, setIsCalling] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen) return null;

    const handleCall = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCalling(true);
        try {
            const { data, error } = await supabase.functions.invoke('make-warranty-call', {
                body: {
                    phone,
                    customerName: customerName || 'Valued Customer',
                    productName: 'Sony A7 IV Camera', // Example product
                    purchaseDate: new Date().toISOString()
                }
            });

            if (error) {
                throw new Error(error.message || 'Supabase function invocation failed');
            }

            if (data?.success) {
                setIsSuccess(true);
                setTimeout(() => {
                    onClose();
                    setIsSuccess(false);
                    setPhone('');
                    setCustomerName('');
                }, 3000);
            } else {
                console.error('Function returned error:', data);
                throw new Error(data?.error || 'Failed to start call. Check Supabase logs.');
            }
        } catch (err: any) {
            console.error('Call initialization catch:', err);
            alert(err.message);
        } finally {
            setIsCalling(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600/20 p-2 rounded-lg">
                            <Phone className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Henry's AI Call</h2>
                            <p className="text-xs text-slate-400">Experience Catherine's Warranty Pitch</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8">
                    {isSuccess ? (
                        <div className="text-center py-8 animate-in zoom-in duration-300">
                            <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50">
                                <CheckCircle2 className="text-green-500" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Call Initiated!</h3>
                            <p className="text-slate-400">
                                Your phone should be ringing in a few seconds.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleCall} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
                                <input
                                    type="text"
                                    placeholder="Jane Doe"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-700 font-medium"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Mobile Phone</label>
                                <input
                                    type="tel"
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-700 font-medium"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                />
                                <p className="mt-2 text-[10px] text-slate-500 italic"> Catherine will call this number for a demo pitch. </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isCalling}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
                            >
                                {isCalling ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Dialing...
                                    </>
                                ) : (
                                    <>
                                        Try Catherine Now
                                        <Phone size={20} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
