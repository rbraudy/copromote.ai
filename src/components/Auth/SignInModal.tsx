import React, { useState } from 'react';
import Modal from '../UI/Modal';

interface SignInModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'email' | 'otp';

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Check if user exists in mock DB
        const users = JSON.parse(localStorage.getItem('copromote_users') || '[]');
        const userExists = users.some((u: any) => u.businessEmail === email);

        if (userExists) {
            console.log('Sending OTP to:', email);
            alert(`(Demo) Verification code sent to ${email}. Code: 123456`);
            setStep('otp');
        } else {
            alert('No account found with this email. Please Sign Up first.');
        }
    };

    const handleOtpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (otp === '123456') {
            alert(`Success! You are now signed in.`);
            onClose();
            // Reset
            setStep('email');
            setEmail('');
            setOtp('');
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
                        className="w-full py-3 mt-4 bg-accent-blue text-white font-bold rounded-lg hover:bg-accent-purple transition duration-300 transform hover:scale-[1.02]"
                    >
                        Verify & Sign In
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
