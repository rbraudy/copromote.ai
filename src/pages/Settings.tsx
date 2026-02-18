import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, AlertCircle, CheckCircle, X, Upload, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
    const { role, companyId, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        brand_name: '',
        domain: '',
        primary_color: '#3b82f6',
        secondary_color: '#1e293b',
        logo_url: '',
        support_email: ''
    });

    useEffect(() => {
        if (companyId) {
            fetchConfig(companyId);
        }
    }, [companyId]);

    const fetchConfig = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('tenant_config')
                .select('*')
                .eq('company_id', id)
                .single();

            if (data) {
                setFormData({
                    brand_name: data.brand_name || '',
                    domain: data.domain || '',
                    primary_color: data.primary_color || '#3b82f6',
                    secondary_color: data.secondary_color || '#1e293b',
                    logo_url: data.logo_url || '',
                    support_email: data.support_email || ''
                });
            } else if (error && error.code !== 'PGRST116') {
                console.error('Error fetching config:', error);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !companyId) return;

        setUploading(true);
        setMessage(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${companyId}/logo_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `branding/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('branding')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('branding')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, logo_url: publicUrl }));
            setMessage({ type: 'success', text: 'Logo uploaded! Don\'t forget to save changes.' });
        } catch (error: any) {
            console.error('Upload error:', error);
            setMessage({ type: 'error', text: `Upload failed: ${error.message}` });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (!companyId) {
            setMessage({ type: 'error', text: 'No Company ID found. Access Denied.' });
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase
                .from('tenant_config')
                .upsert({
                    company_id: companyId,
                    ...formData,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Settings updated successfully!' });
        } catch (err: any) {
            console.error('Update error:', err);
            setMessage({ type: 'error', text: err.message || 'Failed to update settings.' });
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return <div className="p-8 text-center text-slate-400">Loading settings...</div>;

    if (role !== 'admin' && role !== 'superadmin') {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-2">
                    <AlertCircle size={20} />
                    <span>Access Denied. You must be an Admin to view this page.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Company Settings</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your branding, domain, and colors.</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"
                    title="Close"
                >
                    <X size={24} />
                </button>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${message.type === 'success'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-8 backdrop-blur-sm">

                {/* Brand Identity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Brand Name
                        </label>
                        <input
                            type="text"
                            name="brand_name"
                            value={formData.brand_name}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="e.g. Henry's Camera"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Custom Subdomain
                        </label>
                        <div className="flex items-center">
                            <input
                                type="text"
                                name="domain"
                                value={formData.domain}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-l-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="henrys"
                            />
                            <span className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-l-0 border-slate-300 dark:border-slate-700 rounded-r-xl text-slate-500 dark:text-slate-400 font-medium">
                                .copromote.ai
                            </span>
                        </div>
                    </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Primary Color
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                name="primary_color"
                                value={formData.primary_color}
                                onChange={handleChange}
                                className="h-12 w-12 p-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-950 cursor-pointer"
                            />
                            <input
                                type="text"
                                name="primary_color"
                                value={formData.primary_color}
                                onChange={handleChange}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Secondary Color
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                name="secondary_color"
                                value={formData.secondary_color}
                                onChange={handleChange}
                                className="h-12 w-12 p-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-950 cursor-pointer"
                            />
                            <input
                                type="text"
                                name="secondary_color"
                                value={formData.secondary_color}
                                onChange={handleChange}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Assets & Support */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Company Logo
                        </label>
                        <div className="flex items-center gap-4">
                            {formData.logo_url && (
                                <div className="h-16 w-16 rounded-xl border border-slate-700 overflow-hidden bg-slate-950 flex items-center justify-center p-2">
                                    <img src={formData.logo_url} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                                </div>
                            )}
                            <div className="flex-1">
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        name="logo_url"
                                        value={formData.logo_url}
                                        onChange={handleChange}
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="https://example.com/logo.png"
                                    />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                        Upload
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Support Email
                        </label>
                        <input
                            type="email"
                            name="support_email"
                            value={formData.support_email}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="support@company.com"
                        />
                    </div>
                </div>

                {/* Submit Action */}
                <div className="pt-6 flex justify-end border-t border-slate-800">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : (
                            <>
                                <Save size={18} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>

            </form>
        </div>
    );
}

