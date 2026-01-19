import React, { useState } from 'react';
import {
    X, ChevronRight, ChevronLeft, Phone,
    CheckCircle2, Loader2, Sparkles, Building2,
    Mic2, MessageSquare, ShieldCheck, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GetStartedModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const steps = [
    { id: 'industry', title: 'Target Industry', icon: Building2 },
    { id: 'personality', title: 'Agent Persona', icon: Mic2 },
    { id: 'execution', title: 'Live Demo', icon: Zap },
];

const industries = [
    { id: 'hvac', label: 'HVAC & Plumbing', description: 'Equipment warranties and maintenance plans' },
    { id: 'electronics', label: 'Consumer Electronics', description: 'Accidental damage and extended protection' },
    { id: 'auto', label: 'Automotive', description: 'Vehicle service contracts and roadside' },
    { id: 'appliances', label: 'Home Appliances', description: 'System-wide protection and repair' },
];

const personas = [
    { id: 'professional', label: 'The Specialist', description: 'Expert, technical, and highly efficient', icon: ShieldCheck },
    { id: 'friendly', label: 'The Trusted Advisor', description: 'Warm, empathetic, and conversational', icon: MessageSquare },
    { id: 'energetic', label: 'The Closer', description: 'Dynamic, persuasive, and fast-paced', icon: Sparkles },
];

export const GetStartedModal: React.FC<GetStartedModalProps> = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        industry: '',
        persona: '',
        recipientName: '',
        agentName: 'Claire',
        phone: '',
    });
    const [isCalling, setIsCalling] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen) return null;

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleCall = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCalling(true);
        try {
            const { data, error } = await supabase.functions.invoke('make-warranty-call-v2', {
                body: {
                    phone: formData.phone,
                    customerName: formData.recipientName || 'Valued Partner',
                    agentName: formData.agentName,
                    productName: formData.industry === 'hvac' ? 'Carrier Infinity AC' : 'High-End Equipment',
                    purchaseDate: new Date().toISOString()
                }
            });

            if (error) throw new Error(error.message);

            if (data?.success) {
                setIsSuccess(true);
            } else {
                throw new Error(data?.error || 'Failed to start call');
            }
        } catch (err: any) {
            console.error(err);
            alert(err.message);
        } finally {
            setIsCalling(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden relative">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                    <div
                        className="h-full bg-blue-600 transition-all duration-500 ease-out"
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    />
                </div>

                {/* Header */}
                <div className="flex justify-between items-center p-8 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center">
                            {React.createElement(steps[currentStep].icon, { className: "text-blue-400 w-6 h-6" })}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">{steps[currentStep].title}</h2>
                            <p className="text-sm text-slate-500">Step {currentStep + 1} of {steps.length}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-slate-500 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-10 min-h-[400px]">
                    {currentStep === 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-right-4 duration-300">
                            {industries.map((industry) => (
                                <button
                                    key={industry.id}
                                    onClick={() => { setFormData({ ...formData, industry: industry.id }); handleNext(); }}
                                    className={`p-6 rounded-3xl border text-left transition-all group ${formData.industry === industry.id
                                        ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <h4 className="font-bold mb-1">{industry.label}</h4>
                                    <p className="text-xs text-slate-400 group-hover:text-slate-300">{industry.description}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {currentStep === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            {personas.map((persona) => (
                                <button
                                    key={persona.id}
                                    onClick={() => { setFormData({ ...formData, persona: persona.id }); handleNext(); }}
                                    className={`w-full p-6 rounded-3xl border text-left flex items-center gap-6 transition-all group ${formData.persona === persona.id
                                        ? 'bg-blue-600 border-blue-500'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div className={`p-4 rounded-2xl ${formData.persona === persona.id ? 'bg-white/20' : 'bg-blue-600/10'}`}>
                                        <persona.icon className={`w-6 h-6 ${formData.persona === persona.id ? 'text-white' : 'text-blue-400'}`} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold mb-1">{persona.label}</h4>
                                        <p className="text-xs text-slate-400 group-hover:text-slate-300">{persona.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="max-w-md mx-auto text-center animate-in slide-in-from-right-4 duration-300">
                            {isSuccess ? (
                                <div className="py-10">
                                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/40">
                                        <CheckCircle2 className="text-emerald-500 w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3">Call Activated!</h3>
                                    <p className="text-slate-400">Your custom {formData.persona} agent, <strong>{formData.agentName}</strong>, is dialing you now to showcase the {formData.industry} pitch.</p>
                                    <button onClick={onClose} className="mt-8 px-8 py-3 bg-white text-slate-950 font-bold rounded-2xl hover:bg-slate-200 transition-all">
                                        Close & Explore
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleCall} className="space-y-6">
                                    <div className="space-y-4 text-left">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-2">Recipient Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Your Name"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-700"
                                                    value={formData.recipientName}
                                                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-2">Agent Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Claire"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-700"
                                                    value={formData.agentName}
                                                    onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">Mobile Phone</label>
                                            <input
                                                type="tel"
                                                placeholder="+1 (555) 000-0000"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-700"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isCalling}
                                        className="w-full bg-blue-600 py-5 rounded-[24px] font-bold text-lg hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 disabled:opacity-50"
                                    >
                                        {isCalling ? <Loader2 className="animate-spin" /> : <Phone className="w-5 h-5" />}
                                        {isCalling ? 'Deploying Agent...' : 'Send Live Demo Call'}
                                    </button>
                                    <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">No Credit Card Required • Instant Deployment</p>
                                </form>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {currentStep < 2 && (
                    <div className="p-8 border-t border-white/5 flex justify-between items-center bg-slate-900/50">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 0}
                            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-white transition-colors disabled:opacity-0"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                        <div className="flex gap-2">
                            {steps.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentStep ? 'bg-blue-500' : 'bg-white/10'}`} />
                            ))}
                        </div>
                        <button
                            onClick={handleNext}
                            disabled={(currentStep === 0 && !formData.industry) || (currentStep === 1 && !formData.persona)}
                            className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
