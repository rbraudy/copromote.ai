import React, { useState } from 'react';
import HenrysHeader from '../components/Layout/HenrysHeader';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, Lock, CreditCard } from 'lucide-react';

const HelpCheckout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { plan } = location.state || { plan: { name: 'Default', price: '$0.00' } };
    const [isProcessing, setIsProcessing] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    // 🔒 Security Gate: Strict Session Check
    const params = new URLSearchParams(window.location.search);
    const prospectId = params.get('session') || location.state?.prospectId;

    if (!prospectId) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-black font-henrys flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 border-t-4 border-orange-600 shadow-xl">
                    <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                        <Lock className="w-8 h-8 text-gray-400" />
                    </div>
                    <h1 className="text-2xl font-black uppercase italic mb-4 text-slate-900 dark:text-white">Secure Checkout</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        This checkout session has expired or is invalid. Please restart the process from the link in your text message.
                    </p>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        // Get prospectId from session/URL if available, otherwise mock/fail
        // For now, let's assume session is passed via navigation state or URL
        // We might need to lift the session check up or pass it down.
        // Let's grab it from URL params for robustness if state is missing
        const params = new URLSearchParams(window.location.search);
        const prospectId = params.get('session') || location.state?.prospectId;

        if (!prospectId) {
            alert('Error: No active session found. Please return to the pricing page.');
            setIsProcessing(false);
            return;
        }

        try {
            const { supabase } = await import('../lib/supabase');
            const { data, error } = await supabase.functions.invoke('process-warranty-sale', {
                body: {
                    prospectId,
                    plan,
                    paymentDetails: {
                        // In a real app, collect these from Stripe Elements
                        method: 'credit_card',
                        last4: '4242'
                    }
                }
            });

            if (error) throw error;

            console.log('Purchase Successful:', data);
            alert(`Purchase successful! Trans ID: ${data.transactionId}`);
            // Navigate to a dedicated success page or back home
            navigate('/henrys?success=true');

        } catch (err: any) {
            console.error('Checkout Error:', err);
            alert('Payment failed: ' + (err.message || 'Unknown error'));
        } finally {
            setIsProcessing(false);
        }
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

                            <div className="flex items-start gap-3 my-4 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-100 dark:border-zinc-800">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    required
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="mt-1 w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-600 cursor-pointer"
                                />
                                <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                                    I confirm that my product is in good working order and I agree to the <a href="#" className="font-bold underline hover:text-orange-600 transition-colors">Terms & Conditions</a> of the Henry's Extended Protection Plan.
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isProcessing || !termsAccepted}
                                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-orange-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {isProcessing ? 'Processing...' : `Pay ${plan.price} Now`} <Lock size={18} className="group-hover:scale-110 transition-transform" />
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
