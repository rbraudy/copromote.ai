import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function Settings() {
    const { role, companyId, loading: authLoading } = useAuth();
    // const { tenant } = useTenant(); // Unused for now as we fetch fresh config
    // Better to fetch fresh to ensure we edit what's in DB.

    const [loading, setLoading] = useState(false);
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
                // If error is not "Msg not found" (which happens if no config exists yet)
                console.error('Error fetching config:', error);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
            // Upsert config
            const { error } = await supabase
                .from('tenant_config')
                .upsert({
                    company_id: companyId,
                    ...formData,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Settings updated successfully! Refresh to see changes.' });
        } catch (err: any) {
            console.error('Update error:', err);
            setMessage({ type: 'error', text: err.message || 'Failed to update settings.' });
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return <div className="p-8 text-center">Loading settings...</div>;

    if (role !== 'admin' && role !== 'superadmin') {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
                    <AlertCircle size={20} />
                    <span>Access Denied. You must be an Admin to view this page.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Company Settings</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your branding, domain, and colors.</p>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">

                {/* Brand Identity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Brand Name
                        </label>
                        <input
                            type="text"
                            name="brand_name"
                            value={formData.brand_name}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Henry's Camera"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Custom Subdomain
                        </label>
                        <div className="flex items-center">
                            <input
                                type="text"
                                name="domain"
                                value={formData.domain}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-l-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder="henrys"
                            />
                            <span className="px-4 py-2 bg-slate-100 dark:bg-slate-600 border border-l-0 border-slate-300 dark:border-slate-600 rounded-r-lg text-slate-500 dark:text-slate-400">
                                .copromote.ai
                            </span>
                        </div>
                    </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Primary Color (Buttons, Highlights)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                name="primary_color"
                                value={formData.primary_color}
                                onChange={handleChange}
                                className="h-10 w-10 p-1 rounded border border-slate-300 cursor-pointer"
                            />
                            <input
                                type="text"
                                name="primary_color"
                                value={formData.primary_color}
                                onChange={handleChange}
                                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Secondary Color (Backgrounds, Dark Accents)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                name="secondary_color"
                                value={formData.secondary_color}
                                onChange={handleChange}
                                className="h-10 w-10 p-1 rounded border border-slate-300 cursor-pointer"
                            />
                            <input
                                type="text"
                                name="secondary_color"
                                value={formData.secondary_color}
                                onChange={handleChange}
                                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* Assets */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Logo URL
                    </label>
                    <input
                        type="url"
                        name="logo_url"
                        value={formData.logo_url}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/logo.png"
                    />
                    <p className="text-xs text-slate-500 mt-1">Paste a public URL for your logo (SVG or PNG recommended).</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Support Email
                    </label>
                    <input
                        type="email"
                        name="support_email"
                        value={formData.support_email}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="support@company.com"
                    />
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : (
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
