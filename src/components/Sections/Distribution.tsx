import React from 'react';
import { Mail, MessageSquare, Bot } from 'lucide-react';

const Distribution: React.FC = () => {
    return (
        <section className="py-24 bg-primary-dark">
            <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="lg:w-1/2">
                    <p className="text-lg font-semibold text-accent-blue uppercase mb-2">Omni-Channel Distribution</p>
                    <h3 className="text-5xl font-extrabold mb-6">Share Promotions Where Sales Happen.</h3>
                    <p className="text-xl text-slate-300 mb-8">
                        Once generated, your visual, compelling promotions are optimized for direct sharing across all
                        critical sales channels.
                    </p>

                    <ul className="space-y-4 text-lg text-slate-200">
                        <li className="flex items-center">
                            <span className="text-accent-purple mr-3"><Mail size={24} /></span> Ready for Email campaigns.
                        </li>
                        <li className="flex items-center">
                            <span className="text-accent-purple mr-3"><MessageSquare size={24} /></span> Optimized for Text/SMS and Social Media.
                        </li>
                        <li className="flex items-center">
                            <span className="text-accent-purple mr-3"><Bot size={24} /></span> Integrated AI-Powered Salesperson Delivery.
                        </li>
                    </ul>
                </div>
                <div className="lg:w-1/2">
                    <img
                        src="https://placehold.co/600x400/0F172A/8B5CF6?text=Distribution+Channels+Graphic"
                        alt="Graphic showing various distribution channels."
                        className="w-full h-auto rounded-xl border border-slate-700 opacity-90"
                    />
                </div>
            </div>
        </section>
    );
};

export default Distribution;
