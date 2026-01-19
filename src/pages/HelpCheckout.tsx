import React, { useState } from 'react';
import HenrysHeader from '../components/Layout/HenrysHeader';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, Lock, CreditCard } from 'lucide-react';

const HelpCheckout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { plan } = location.state || { plan: { name: 'Default', price: '$0.00' } };
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        // Simulate API call
        setTimeout(() => {
            setIsProcessing(false);
            alert('Purchase successful! (Mock)');
            navigate('/help');
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black font-henrys text-slate-900 dark:text-white">
            <HenrysHeader />

            <div className="pt-32 pb-12 px-6 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Order Summary */}
                    <div className="order-2 lg:order-1">
                        <h2 className="text-3xl font-black uppercase italic mb-8">Secure Checkout</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase text-gray-500">First Name</label>
                                    <input required type="text" className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-orange-600 focus:ring-0 outline-none transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase text-gray-500">Last Name</label>
                                    <input required type="text" className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-orange-600 focus:ring-0 outline-none transition-colors" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase text-gray-500">Email Address</label>
                                <input required type="email" className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-orange-600 focus:ring-0 outline-none transition-colors" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase text-gray-500">Card Information</label>
                                <div className="relative">
                                    <input required type="text" placeholder="0000 0000 0000 0000" className="w-full p-3 pl-10 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-orange-600 focus:ring-0 outline-none transition-colors" />
                                    <CreditCard className="absolute left-3 top-3 text-gray-400" size={20} />
                                </div>
                                <div className="grid grid-cols-2 gap-6 mt-2">
                                    <input required type="text" placeholder="MM/YY" className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-orange-600 focus:ring-0 outline-none transition-colors" />
                                    <input required type="text" placeholder="CVC" className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-orange-600 focus:ring-0 outline-none transition-colors" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-orange-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Processing...' : `Pay ${plan.price} Now`} <Lock size={18} />
                            </button>

                            <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
                                <Shield size={12} /> Secure 256-bit SSL Encrypted Payment
                            </p>
                        </form>
                    </div>

                    {/* Cart Summary */}
                    <div className="order-1 lg:order-2">
                        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-8 sticky top-32">
                            <h3 className="text-xl font-bold uppercase mb-6 flex items-center gap-2">
                                <Shield className="text-orange-600" /> Order Summary
                            </h3>

                            <div className="flex justify-between items-start py-4 border-b border-gray-200 dark:border-zinc-800">
                                <div>
                                    <h4 className="font-bold text-lg">{plan.name} Plan</h4>
                                    <p className="text-sm text-gray-500">Henry's Extended Limited Protection</p>
                                </div>
                                <span className="font-bold">{plan.price}</span>
                            </div>

                            <div className="py-4 space-y-2">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Subtotal</span>
                                    <span>{plan.price}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Tax (HST 13%)</span>
                                    <span>${(parseFloat(plan.price.replace('$', '')) * 0.13).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t-2 border-dashed border-gray-200 dark:border-zinc-800">
                                <span className="font-black uppercase text-xl">Total</span>
                                <span className="font-black text-2xl text-orange-600">
                                    ${(parseFloat(plan.price.replace('$', '')) * 1.13).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpCheckout;
