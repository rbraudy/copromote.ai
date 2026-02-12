import React, { useState } from 'react';
import Modal from '../UI/Modal';
// import { auth } from '../../lib/firebase'; // Removed
// import { signInWithEmailAndPassword } from 'firebase/auth'; // Removed
import { supabase } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Eye, EyeOff } from 'lucide-react';

interface SignInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSignInSuccess?: (user: User) => void;
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onSignInSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                // Optimistic update if needed, though AuthContext handles it
                if (onSignInSuccess) {
                    onSignInSuccess(data.user);
                }
                onClose();
                // Reset
                setEmail('');
                setPassword('');
            }
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || "Failed to sign in");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Sign In">
            <form onSubmit={handleSignIn} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 rounded-lg bg-primary-dark border border-slate-700 text-white focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                        placeholder="you@company.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 pr-10 rounded-lg bg-primary-dark border border-slate-700 text-white focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 mt-4 bg-accent-blue text-white font-bold rounded-lg hover:bg-accent-purple transition duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>
        </Modal>
    );
};

export default SignInModal;
