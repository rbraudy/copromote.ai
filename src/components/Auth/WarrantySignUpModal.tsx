import React, { useState } from 'react';
import Modal from '../UI/Modal';
// import { auth, db } from '../../lib/firebase'; // Removed
// import { createUserWithEmailAndPassword } from 'firebase/auth'; // Removed
// import { doc, setDoc } from 'firebase/firestore'; // Removed
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

interface WarrantySignUpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WarrantySignUpModal: React.FC<WarrantySignUpModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        businessName: '',
        email: '',
        password: '' // Added password field for Supabase Auth
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create User in Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        business_name: formData.businessName,
                        type: 'warranty_user' // Meta data for Trigger to use
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                console.log('User Registered:', data.user.id);
                // Note: We need a Database Trigger to create the 'user_profiles' and 'companies' records
                // based on this metadata. We will implement that next.

                alert(`Welcome, ${formData.fullName}! Please check your email to confirm your account.`);
                onClose();
                setFormData({ fullName: '', businessName: '', email: '', password: '' });
            }
        } catch (error: any) {
            console.error("Error signing up:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Start Selling Warranties">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-1">
                        Full Name
                    </label>
                    <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        required
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-primary-dark border border-slate-700 text-white focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                        placeholder="John Smith"
                    />
                </div>

                <div>
                    <label htmlFor="businessName" className="block text-sm font-medium text-slate-300 mb-1">
                        Business Name
                    </label>
                    <input
                        type="text"
                        id="businessName"
                        name="businessName"
                        required
                        value={formData.businessName}
                        onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-primary-dark border border-slate-700 text-white focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                        placeholder="Acme Camera Shop"
                    />
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
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
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
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
                    {loading ? 'Creating Account...' : 'Get Started'}
                </button>
            </form>
        </Modal>
    );
};

export default WarrantySignUpModal;
