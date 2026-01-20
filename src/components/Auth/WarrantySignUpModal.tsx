import React, { useState } from 'react';
import Modal from '../UI/Modal';
import { auth, db } from '../../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface WarrantySignUpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WarrantySignUpModal: React.FC<WarrantySignUpModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        businessName: '',
        email: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create User in Firebase Auth (using a default password for this demo flow)
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, "copromote123");
            const user = userCredential.user;

            // 2. Save additional details to Firestore
            await setDoc(doc(db, "users", user.uid), {
                fullName: formData.fullName,
                businessName: formData.businessName,
                email: formData.email,
                type: 'warranty_user', // Tagging them specifically
                createdAt: new Date().toISOString()
            });

            console.log('User Registered:', user.uid);
            alert(`Welcome, ${formData.fullName}! Your warranty account has been created.`);
            onClose();
            setFormData({ fullName: '', businessName: '', email: '' });
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
