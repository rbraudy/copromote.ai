import React, { useState } from 'react';
import Modal from '../UI/Modal';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { User } from 'firebase/auth';

interface SignInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSignInSuccess?: (user: User) => void;
}

type Step = 'email' | 'otp';

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onSignInSuccess }) => {
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, we would check if the email exists or trigger the OTP email here.
        // For this demo with "hidden password", we just proceed to the OTP step.
        console.log('Sending OTP to:', email);
        alert(`(Demo) Verification code sent to ${email}. Code: 123456`);
        setStep('otp');
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp === '123456') {
            setLoading(true);
            try {
                // Sign in with the default password
                const userCredential = await signInWithEmailAndPassword(auth, email, "copromote123");
                alert(`Success! You are now signed in.`);

                // Optimistic update
                if (onSignInSuccess) {
                    onSignInSuccess(userCredential.user);
                }

                onClose();
                // Reset
                setStep('email');
                setEmail('');
                setOtp('');
            } catch (error: any) {
                console.error("Login error:", error);
                alert(`Login failed: ${error.message}. (Did you sign up first?)`);
            } finally {
                setLoading(false);
            }
        } else {
            alert('Invalid code. Please try again (Hint: 123456)');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={step === 'email' ? "Sign In" : "Verify Your Email"}>
            {step === 'email' ? (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                            Business Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-lg bg-primary-dark border border-slate-700 text-white focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                            placeholder="you@company.com"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 mt-4 bg-accent-blue text-white font-bold rounded-lg hover:bg-accent-purple transition duration-300 transform hover:scale-[1.02]"
                    >
                        Send Verification Code
                    </button>
                </form>
            ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                    <p className="text-slate-300 text-sm mb-4">
                        We sent a 6-digit code to <span className="font-semibold text-white">{email}</span>.
                    </p>

                    <div>
                        <label htmlFor="otp" className="block text-sm font-medium text-slate-300 mb-1">
                            Verification Code
                        </label>
                        <input
                            type="text"
                            id="otp"
                            name="otp"
                            required
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full p-3 rounded-lg bg-primary-dark border border-slate-700 text-white text-center text-2xl tracking-widest focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                            placeholder="000000"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 mt-4 bg-accent-blue text-white font-bold rounded-lg hover:bg-accent-purple transition duration-300 transform hover:scale-[1.02] disabled:opacity-50"
                    >
                        {loading ? 'Verifying...' : 'Verify & Sign In'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setStep('email')}
                        className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Back to email
                    </button>
                </form>
            )}
        </Modal>
    );
};

export default SignInModal;
