import React, { useState } from 'react';
import Modal from '../UI/Modal';

interface SignUpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SignUpModal: React.FC<SignUpModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        businessName: '',
        businessEmail: '',
        storeUrl: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Simulate saving to database (localStorage)
        const existingUsers = JSON.parse(localStorage.getItem('copromote_users') || '[]');
        existingUsers.push(formData);
        localStorage.setItem('copromote_users', JSON.stringify(existingUsers));

        console.log('User Registered:', formData);
        alert(`Welcome to CoPromote.ai, ${formData.businessName}! Your account has been created.`);
        onClose();
        setFormData({ businessName: '', businessEmail: '', storeUrl: '' });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Your Account">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                        placeholder="Acme Corp"
                    />
                </div>

                <div>
                    <label htmlFor="businessEmail" className="block text-sm font-medium text-slate-300 mb-1">
                        Business Email
                    </label>
                    <input
                        type="email"
                        id="businessEmail"
                        name="businessEmail"
                        required
                        value={formData.businessEmail}
                        onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-primary-dark border border-slate-700 text-white focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                        placeholder="you@company.com"
                    />
                </div>

                <div>
                    <label htmlFor="storeUrl" className="block text-sm font-medium text-slate-300 mb-1">
                        Store URL
                    </label>
                    <input
                        type="url"
                        id="storeUrl"
                        name="storeUrl"
                        required
                        value={formData.storeUrl}
                        onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-primary-dark border border-slate-700 text-white focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                        placeholder="https://mystore.com"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-3 mt-4 bg-accent-blue text-white font-bold rounded-lg hover:bg-accent-purple transition duration-300 transform hover:scale-[1.02]"
                >
                    Create Account
                </button>
            </form>
        </Modal>
    );
};

export default SignUpModal;
