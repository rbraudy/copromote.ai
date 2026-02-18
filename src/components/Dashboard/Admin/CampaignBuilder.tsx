import { useState, useEffect } from 'react';
import {
    CheckCircle2,
    Save,
    Zap,
    ArrowLeft,
    ChevronRight,
    AlertCircle,
    Code,
    Sparkles,
    Loader2,
    Trash2,
    BookOpen,
    Play,
    Phone,
    PhoneCall,
    Shield,
    FileJson,
    Upload,
    X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';


interface CampaignConfig {
    company_id?: string;
    system_template_id: string;
    product_info: {
        name: string;
        description?: string;
        price?: string;
        pain_points?: string[];
        key_features?: string[];
    };
    agent_behavior: {
        tone: string | number; // allow both for legacy
        pace?: string;
        patience?: number;
        persuasiveness?: number;
        sales_philosophy: string;
    };
    guardrails: string[];
    program_profile: {
        model: 'tiered' | 'dynamic' | 'static' | 'individual' | null;
        durations: string[];
        rules: any;
        hidden_discount_enabled: boolean;
        retention_discount?: number;
        retention_type?: 'fixed' | 'percentage';
    };
    knowledge_base: {
        name: string;
        url: string;
        type: string;
        size: number;
    }[];
    campaign_goal?: string;
    target_audience?: string;
    selected_script_ids?: string[];
    is_generated: boolean;
    test_calls_count?: number;
    refinement_notes?: string;
    agent_name?: string;
    voice_id?: string;
    special_offers?: any;
}

export const CampaignBuilder = ({ demoMode = false }: { demoMode?: boolean }) => {
    const { user, companyId, loading: authLoading, role } = useAuth();
    const isSuperAdmin = role === 'superadmin' || user?.email === 'rbraudy@gmail.com';

    // UI State
    const [view, setView] = useState<'wizard' | 'raw'>('wizard');
    const [step, setStep] = useState(1);
    const [showFineTuning, setShowFineTuning] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Data State
    const [config, setConfig] = useState<CampaignConfig>({
        company_id: '',
        system_template_id: '',
        product_info: { name: '', description: '', pain_points: [] },
        agent_behavior: { tone: 'professional', pace: 'moderate', sales_philosophy: 'consultative' },
        knowledge_base: [], // Array of docs
        campaign_goal: 'appointments',
        target_audience: '',
        is_generated: false,
        program_profile: {
            model: null,
            durations: ['1 yr Plan', '2 yr Plan', '3 yr Plan'],
            rules: {},
            hidden_discount_enabled: false,
            retention_discount: 10,
            retention_type: 'percentage'
        },
        guardrails: [],
        test_calls_count: 0,
        refinement_notes: '',
        agent_name: 'Claire',
        voice_id: 'paige'
    });

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSave = async () => {
        if (!companyId) return;
        setSaving(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const { error: upsertError } = await supabase
                .from('campaign_configs')
                .upsert({
                    company_id: companyId,
                    product_info: config.product_info,
                    agent_behavior: {
                        ...config.agent_behavior,
                        agent_name: config.agent_name,
                        voice_id: config.voice_id
                    },
                    program_profile: config.program_profile,
                    guardrails: config.guardrails,
                    special_offers: {
                        campaign_goal: config.campaign_goal,
                        target_audience: config.target_audience,
                        ...config.special_offers
                    },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'company_id' });

            if (upsertError) throw upsertError;

            // Trigger success animation
            setSuccessMsg("Progress saved successfully!");
            setTimeout(() => setSuccessMsg(null), 3000);

        } catch (err: any) {
            console.error('Error saving campaign config:', err);
            setError(`Failed to save progress: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Auto-save on step change (optional, but good UX)
    useEffect(() => {
        if (config.product_info.name) {
            // Debounce or just save on step exit could go here
            // For now, relies on manual save or specific triggers
        }
    }, [step]);
    const [rawScript, setRawScript] = useState('');

    // Discovery State
    const [discoveryLoading, setDiscoveryLoading] = useState(false);
    const [discoveryResults, setDiscoveryResults] = useState<{
        detectedModel: 'tiered' | 'dynamic' | 'static' | 'individual' | null;
        confidence: number;
        explanation: string;
        brackets?: { min: number, max: number, price: number }[];
        percentage?: number;
        flatRate?: number;
        referenceColumn?: string;
    } | null>(null);

    const [testLead, setTestLead] = useState({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '',
        product: 'Smart TV',
        productPrice: 1200,
        manualWarrantyPrice: 0 // For testing overrides
    });
    const [testMode, setTestMode] = useState<'manual' | 'csv' | 'demo_lead' | null>(null);
    const [testCalling, setTestCalling] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        loadData();
    }, [companyId, authLoading]);

    const loadData = async () => {
        try {
            setLoading(true);
            // 1. Load available templates & verify existence
            const { data: tData } = await supabase
                .from('system_templates')
                .select('id, is_gold_standard')
                .order('is_gold_standard', { ascending: false });

            // Ensure we have a valid default template ID
            const defaultTemplateId = tData && tData.length > 0 ? tData[0].id : '';

            // 2. Load existing config
            if (companyId) {
                const { data: cData } = await supabase
                    .from('campaign_configs')
                    .select('*')
                    .eq('company_id', companyId)
                    .maybeSingle();

                if (cData) {
                    setConfig(prev => ({
                        ...prev,
                        ...cData,
                        system_template_id: cData.system_template_id || defaultTemplateId,
                        // Ensure nested objects are merged correctly to preserve defaults if DB has nulls
                        product_info: { ...prev.product_info, ...(cData.product_info || {}) },
                        agent_behavior: { ...prev.agent_behavior, ...(cData.agent_behavior || {}) },
                        program_profile: {
                            ...prev.program_profile,
                            ...(cData.program_profile || {})
                        },
                        guardrails: cData.guardrails || prev.guardrails,
                        // Map flatten fields back if needed
                        campaign_goal: cData.special_offers?.campaign_goal || prev.campaign_goal,
                        target_audience: cData.special_offers?.target_audience || prev.target_audience,
                        agent_name: cData.agent_behavior?.agent_name || prev.agent_name,
                        voice_id: cData.agent_behavior?.voice_id || prev.voice_id,
                        refinement_notes: cData.refinement_notes || ''
                    }));
                } else {
                    // Initial seed if no config exists
                    await supabase
                        .from('campaign_configs')
                        .upsert({
                            company_id: companyId,
                            system_template_id: defaultTemplateId,
                            updated_at: new Date().toISOString()
                        });
                }

                // Load the script from call_templates
                const { data: sData } = await supabase
                    .from('call_templates')
                    .select('system_prompt')
                    .eq('company_id', companyId)
                    .maybeSingle();

                if (sData) {
                    setRawScript(sData.system_prompt || '');
                    if (cData && !cData.is_generated) {
                        setConfig(prev => ({ ...prev, is_generated: true }));
                    }
                }
            }
        } catch (loadErr: any) {
            console.error('Error loading campaign data:', loadErr);
            setError(loadErr.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-save logic
    useEffect(() => {
        if (loading || !companyId || view === 'raw') return;

        const timer = setTimeout(async () => {
            setSaving(true);
            try {
                const { error: saveErr } = await supabase
                    .from('campaign_configs')
                    .upsert({
                        company_id: companyId,
                        // Explicitly map fields to match DB schema, avoiding "column not found" errors
                        product_info: config.product_info,
                        agent_behavior: {
                            ...config.agent_behavior,
                            agent_name: config.agent_name,
                            voice_id: config.voice_id
                        },
                        program_profile: config.program_profile,
                        guardrails: config.guardrails,
                        special_offers: {
                            campaign_goal: config.campaign_goal,
                            target_audience: config.target_audience,
                            ...config.special_offers
                        },
                        updated_at: new Date().toISOString()
                    });

                if (saveErr) throw saveErr;
            } catch (err: any) {
                console.error('Auto-save failed:', err);
                // If it's a schema error (column doesn't exist), notify the user
                if (err.code === '42703') {
                    setError("Database schema mismatch detected. Some fields may not persist until migrations are applied.");
                }
            } finally {
                setSaving(false);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [config, companyId, loading, view]);
    // Restore Visual State based on Config
    useEffect(() => {
        if (!loading && config.program_profile.model && testMode === null) {
            if (config.program_profile.model === 'individual') {
                setTestMode('csv');
            } else if (['static', 'tiered'].includes(config.program_profile.model)) {
                setTestMode('manual');
            }
        }
    }, [loading, config.program_profile.model]);

    const handleGenerate = async () => {
        if (!companyId) return;
        setGenerating(true);
        setError(null);
        setConfig(prev => ({ ...prev, is_generated: false })); // Reset generated status so success msg hides

        try {
            // First save the config
            const { error: saveError } = await supabase
                .from('campaign_configs')
                .upsert({
                    company_id: companyId,
                    // Explicitly map fields to avoid "column not found" errors
                    product_info: config.product_info,
                    agent_behavior: {
                        ...config.agent_behavior,
                        agent_name: config.agent_name,
                        voice_id: config.voice_id
                    },
                    program_profile: config.program_profile,
                    guardrails: config.guardrails,
                    system_template_id: config.system_template_id, // Ensure this ID is saved
                    special_offers: {
                        campaign_goal: config.campaign_goal,
                        target_audience: config.target_audience,
                        ...config.special_offers
                    },
                    refinement_notes: config.refinement_notes,
                    knowledge_base: config.knowledge_base,
                    updated_at: new Date().toISOString()
                });

            if (saveError) throw saveError;

            // Call Edge Function to generate script
            const { data, error: genError } = await supabase.functions.invoke('generate-campaign-script', {
                body: {
                    companyId,
                    refinement_notes: config.refinement_notes
                }
            });

            if (genError) throw genError;

            setRawScript(data.script);
            setSuccessMsg("Campaign Launched! Your AI is now ready to handle warranty calls.");
            setConfig(prev => ({ ...prev, is_generated: true }));
            setView('raw'); // Show proof of generating
            setTimeout(() => setSuccessMsg(null), 5000);
        } catch (err: any) {
            console.error('Generation failed:', err);
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !companyId) return;

        setSaving(true);
        setError(null);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${companyId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('campaign-knowledge')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('campaign-knowledge')
                .getPublicUrl(filePath);

            const newDoc = {
                name: file.name,
                url: publicUrl,
                type: file.type,
                size: file.size
            };

            const updatedDocs = [...config.knowledge_base, newDoc];
            setConfig({ ...config, knowledge_base: updatedDocs });

            // Automatically save the config to persist the link
            await supabase
                .from('campaign_configs')
                .upsert({
                    company_id: companyId,
                    program_profile: config.program_profile,
                    guardrails: config.guardrails,
                    system_template_id: config.system_template_id,
                    special_offers: {
                        campaign_goal: config.campaign_goal,
                        target_audience: config.target_audience,
                        ...config.special_offers
                    },
                    refinement_notes: config.refinement_notes,
                    knowledge_base: updatedDocs,
                    updated_at: new Date().toISOString()
                });

            setSuccessMsg("Document uploaded and attached to campaign.");
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
            console.error('Upload failed:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveFile = async (index: number) => {
        if (!companyId) return;
        const doc = config.knowledge_base[index];
        const updatedDocs = config.knowledge_base.filter((_, i) => i !== index);

        setConfig({ ...config, knowledge_base: updatedDocs });

        try {
            // Optional: Delete from storage too if we want to be tidy
            const path = doc.url.split('/').pop();
            if (path) {
                await supabase.storage.from('campaign-knowledge').remove([`${companyId}/${path}`]);
            }

            await supabase
                .from('campaign_configs')
                .upsert({
                    company_id: companyId,
                    program_profile: config.program_profile,
                    guardrails: config.guardrails,
                    system_template_id: config.system_template_id,
                    special_offers: {
                        campaign_goal: config.campaign_goal,
                        target_audience: config.target_audience,
                        ...config.special_offers
                    },
                    refinement_notes: config.refinement_notes,
                    knowledge_base: updatedDocs,
                    updated_at: new Date().toISOString()
                });
        } catch (err) {
            console.error("Failed to remove file from storage:", err);
        }
    };

    const scanCSV = async (file: File) => {
        setDiscoveryLoading(true);
        setTestMode('csv');
        setError(null);
        try {
            const text = await file.text();
            const rows = text.split('\n').map(r => r.split(','));
            const headers = rows[0].map(h => h.trim().toLowerCase());
            const dataRows = rows.slice(1).filter(r => r.length > 1);

            if (dataRows.length === 0) throw new Error("The CSV file appears to be empty.");

            // 1. Identify Product Price Column (Anchor logic)
            // Find all numeric columns and pick the one with the highest average value as the reference
            const numericColumns: { idx: number; avg: number; header: string }[] = [];
            const priceKeywords = ['value', 'amount', 'product price', 'cost', 'item price', 'price', 'msrp', 'purchase price'];

            for (let i = 0; i < headers.length; i++) {
                const sample = dataRows.slice(0, 10).map(row => parseFloat(row[i]?.replace(/[^\d.]/g, ''))).filter(v => !isNaN(v));
                if (sample.length > 0) {
                    const avg = sample.reduce((a, b) => a + b, 0) / sample.length;
                    numericColumns.push({ idx: i, avg, header: headers[i] });
                }
            }

            // Rank by average value and keyword match
            const rankedRef = numericColumns.sort((a, b) => {
                const bKeyMatch = priceKeywords.some(k => b.header.includes(k));
                const aKeyMatch = priceKeywords.some(k => a.header.includes(k));
                if (bKeyMatch && !aKeyMatch) return 1;
                if (!bKeyMatch && aKeyMatch) return -1;
                return b.avg - a.avg;
            });

            if (rankedRef.length === 0) throw new Error("Could not find any numeric columns in your CSV.");

            const productPriceIdx = rankedRef[0].idx;
            const productPriceHeader = headers[productPriceIdx];

            // 2. Score other columns as potential Warranty Plans
            const planKeywords = ['bracket', '2yr', '3yr', 'gold', 'silver', 'bronze', 'plan', 'tier', 'level', 'option', 'warranty', 'protection', 'yrs', 'years'];
            const potentialPlans: { idx: number; score: number; avgValue: number; header: string }[] = [];

            for (let i = 0; i < headers.length; i++) {
                if (i === productPriceIdx) continue;

                // DATA EXCLUSION: If the column looks like an email or pure name, skip it
                const sampleValues = dataRows.slice(0, 5).map(row => row[i]?.trim());
                if (sampleValues.some(v => v.includes('@'))) continue;
                if (sampleValues.every(v => /^[a-zA-Z\s.-]+$/.test(v) && v.length > 2)) continue;

                let score = 0;
                // Header Score
                if (planKeywords.some(k => headers[i].includes(k))) score += 7;
                if (['2', '3', '2yr', '3yr', '2yrs', '3yrs', '2 year', '3 year'].some(k => headers[i].includes(k))) score += 10;

                // Data Score
                const samples = dataRows.slice(0, 10).map(row => {
                    const prodVal = parseFloat(row[productPriceIdx]?.replace(/[^\d.]/g, ''));
                    const planVal = parseFloat(row[i]?.replace(/[^\d.]/g, ''));
                    return { prodVal, planVal };
                }).filter(s => !isNaN(s.prodVal) && !isNaN(s.planVal) && s.prodVal > 0);

                if (samples.length > 0) {
                    const ratios = samples.map(s => s.planVal / s.prodVal);
                    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
                    // Warranty prices are usually 3% - 50% of product price
                    if (avgRatio > 0.02 && avgRatio < 0.6) score += 15;

                    const avgPlanVal = samples.reduce((a, b) => a + b.planVal, 0) / samples.length;
                    potentialPlans.push({ idx: i, score, avgValue: avgPlanVal, header: headers[i] });
                }
            }

            const bestPlans = potentialPlans.filter(p => p.score >= 15).sort((a, b) => b.score - a.score);

            // 3. Pattern Detection Logic
            if (bestPlans.length > 0) {

                // Identify all durations
                const detectedDurations = bestPlans.map(p => {
                    const h = p.header.toLowerCase();
                    if (h.includes('3')) return '3YR';
                    if (h.includes('2')) return '2YR';
                    return p.header.toUpperCase();
                });

                // Default to Individual Model
                // This model uses the exact prices from the CSV for each lead
                setDiscoveryResults({
                    detectedModel: 'individual',
                    confidence: 1.0,
                    explanation: `We've identified explicit pricing for ${detectedDurations.join(' & ')} in your CSV. Our AI will use these specific values when calling each prospect.`,
                    referenceColumn: productPriceHeader
                });

                setConfig(prev => ({
                    ...prev,
                    program_profile: {
                        ...prev.program_profile,
                        model: 'individual',
                        durations: detectedDurations,
                        rules: {
                            // Map headers to durations for the backend to use during lead import/lookup
                            mapping: bestPlans.reduce((acc, p, i) => {
                                acc[detectedDurations[i]] = p.header;
                                return acc;
                            }, {} as any)
                        }
                    }
                }));

                setSuccessMsg(`Smart Discovery: Mapped ${detectedDurations.join(' & ')} to your CSV columns.`);
            } else {
                // FALLBACK: Generative Discovery (No warranty column found)
                const prodValues = dataRows.map(r => parseFloat(r[productPriceIdx]?.replace(/[^\d.]/g, ''))).filter(v => !isNaN(v)).sort((a, b) => a - b);
                const min = Math.max(0, prodValues[0]);
                const max = prodValues[prodValues.length - 1];

                const brackets = [
                    { min: 0, max: 500, price: 49 },
                    { min: 501, max: 1500, price: 149 },
                    { min: 1501, max: 5000, price: 299 }
                ];

                setDiscoveryResults({
                    detectedModel: 'tiered',
                    confidence: 0.60,
                    explanation: `We couldn't find existing warranty prices, so we've suggested an industry-standard tiered model based on your product price range ($${min} - $${max}).`,
                    brackets: brackets,
                    referenceColumn: productPriceHeader
                });

                setConfig(prev => ({
                    ...prev,
                    program_profile: { ...prev.program_profile, model: 'tiered', rules: { brackets: brackets } }
                }));

                setSuccessMsg("Pricing range detected. We've suggested a model based on your product values.");
            }

            // check for hidden discount (additional numeric columns)
            const remainingNumeric = potentialPlans.filter(p => !bestPlans.some(bp => bp.idx === p.idx) && p.avgValue > 0);
            if (remainingNumeric.length > 0) {
                setConfig(prev => ({ ...prev, program_profile: { ...prev.program_profile, hidden_discount_enabled: true } }));
            }

        } catch (err: any) {
            setError(`Discovery failed: ${err.message}`);
        } finally {
            setDiscoveryLoading(false);
        }
    };

    const handleSaveRaw = async () => {
        if (!companyId) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('call_templates')
                .upsert({
                    company_id: companyId,
                    system_prompt: rawScript,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;

            await supabase
                .from('campaign_configs')
                .upsert({
                    company_id: companyId,
                    // Persist current config state
                    product_info: config.product_info,
                    agent_behavior: {
                        ...config.agent_behavior,
                        agent_name: config.agent_name,
                        voice_id: config.voice_id
                    },
                    program_profile: config.program_profile,
                    guardrails: config.guardrails,
                    special_offers: {
                        campaign_goal: config.campaign_goal,
                        target_audience: config.target_audience,
                        ...config.special_offers
                    },
                    is_generated: true,
                    updated_at: new Date().toISOString()
                });

            setSuccessMsg("Raw script updated successfully.");
            setConfig(prev => ({ ...prev, is_generated: true }));
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTestCall = async () => {
        if (!testLead.phone) {
            setError("Please enter a phone number for the test call.");
            return;
        }

        setTestCalling(true);
        setError("");
        setSuccessMsg("");

        try {
            console.log('Invoking make-campaign-call-v1...');
            const { data, error: invokeError } = await supabase.functions.invoke('make-campaign-call-v1', {
                body: JSON.stringify({
                    testData: {
                        firstName: testLead.firstName,
                        lastName: testLead.lastName,
                        phone: testLead.phone,
                        product: testLead.product,
                        productPrice: testLead.productPrice
                    },
                    companyId,
                    configOverrides: config
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (invokeError) throw invokeError;
            if (data?.error) throw new Error(data.error);

            setSuccessMsg("Test call initiated! Check your phone.");
            setTimeout(() => {
                setSuccessMsg(null);
                setTestMode(null); // Close test modal
                setShowFineTuning(true); // Reveal fine-tuning box
            }, 2000);
        } catch (err: any) {
            console.error('Test call failed:', err);
            setError(err.message || "Failed to initiate test call.");
        } finally {
            setTestCalling(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-slate-500">Initializing Campaign Builder...</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 relative">
            {demoMode && (
                <div className="absolute top-0 right-4 bg-blue-600/20 border border-blue-500/30 text-blue-200 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 animate-pulse">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    Interactive Demo Mode
                </div>
            )}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Sparkles className="text-blue-400" />
                        Campaign Builder
                    </h2>
                    <p className="text-slate-400 mt-2">Level 3: Strategic AI Configuration</p>
                </div>
                <div className="flex gap-2">
                    {isSuperAdmin && (
                        <button
                            onClick={() => setView(view === 'wizard' ? 'raw' : 'wizard')}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center gap-2 transition-all border border-slate-700"
                        >
                            <Code size={18} />
                            {view === 'wizard' ? 'View Raw Script' : 'Back to Builder'}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-3 animate-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 flex items-center gap-3 animate-in slide-in-from-top-2">
                    <CheckCircle2 size={20} />
                    {successMsg}
                </div>
            )}

            {view === 'wizard' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Progress Sidebar */}
                    <div className="lg:col-span-3 space-y-4">
                        {[
                            { id: 1, label: 'Product', icon: Zap },
                            { id: 2, label: 'Knowledge Base', icon: BookOpen },
                            { id: 3, label: 'Pricing', icon: Sparkles },
                            { id: 4, label: 'Script', icon: FileJson },
                            { id: 5, label: 'Launch', icon: Play }
                        ].map((s) => {
                            const isCompleted = () => {
                                switch (s.id) {
                                    case 1: return config.product_info.name.trim() !== "";
                                    case 2: return config.knowledge_base.length > 0;
                                    case 3: return config.program_profile.model !== null;
                                    case 4: return config.is_generated;
                                    case 5: return false;
                                    default: return false;
                                }
                            };

                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setStep(s.id)}
                                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all border ${step === s.id
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    <s.icon size={18} />
                                    <span className="font-bold">{s.label}</span>
                                    {isCompleted() && <CheckCircle2 size={16} className="ml-auto text-green-400 animate-in zoom-in-50" />}
                                </button>
                            );
                        })}

                        {/* Global Save Button */}
                        <div className="pt-4 border-t border-slate-800 mt-4">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700 flex items-center justify-center gap-2 group"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin text-blue-400" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                        <span>Save Progress</span>
                                    </>
                                )}
                            </button>
                            <p className="text-[10px] text-center text-slate-500 mt-2">
                                Changes map to Company ID: {companyId?.slice(0, 8)}...
                            </p>
                        </div>

                    </div>

                    {/* Main Config Area */}
                    <div className="lg:col-span-9 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm min-h-[500px] flex flex-col">
                        {saving && (
                            <div className="mb-4 flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20 w-fit animate-in fade-in zoom-in-95">
                                <Loader2 size={10} className="animate-spin text-green-500" />
                                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest leading-none">Saving Progress...</span>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <h3 className="text-xl font-bold text-white">Product</h3>
                                <p className="text-slate-400">What are you selling?<br />This helps the AI understand the context of the sales conversation.</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Product Category / Industry</label>
                                        <input
                                            type="text"
                                            value={config.product_info.name}
                                            onChange={(e) => setConfig({ ...config, product_info: { ...config.product_info, name: e.target.value } })}
                                            placeholder="e.g. Camera Warranties, Electronics..."
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                <h3 className="text-xl font-bold text-white">Knowledge Base</h3>
                                <p className="text-slate-400">Upload documents such as warranty features, policies, and existing scripts.<br />Our AI will reference these materials during sales calls.</p>

                                {/* Knowledge Base Section */}
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Source Material</label>
                                    <div
                                        className="border-2 border-dashed border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 hover:border-blue-500/50 transition-all bg-slate-950/50 group relative"
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) {
                                                const event = { target: { files: [file] } } as any;
                                                handleFileUpload(event);
                                            }
                                        }}
                                    >
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleFileUpload}
                                            accept=".pdf,.doc,.docx,.txt,.csv"
                                        />
                                        <div className="h-16 w-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                            <Upload size={32} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white font-bold tracking-tight">Drop program PDFs or technical docs here</p>
                                            <p className="text-slate-500 text-sm mt-1">Support for PDF, DOCX, TXT (Max 10MB)</p>
                                        </div>
                                    </div>

                                    {config.knowledge_base.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                            {config.knowledge_base.map((doc, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800 rounded-xl group hover:border-blue-500/30 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 bg-blue-600/10 rounded flex items-center justify-center text-blue-400">
                                                            <BookOpen size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-white text-xs font-bold truncate max-w-[150px]">{doc.name}</p>
                                                            <p className="text-[10px] text-slate-500 uppercase">{(doc.size / 1024 / 1024).toFixed(2)} MB</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleRemoveFile(i)} className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>


                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <h3 className="text-xl font-bold text-white">Pricing Strategy</h3>
                                <p className="text-slate-400">Enter or upload pricing details to test AI sales calls</p>

                                {testMode === null ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                        <button
                                            onClick={() => setTestMode('manual')}
                                            className="p-8 rounded-3xl border border-slate-800 bg-slate-950/50 hover:bg-slate-900 hover:border-blue-500/50 transition-all text-left group"
                                        >
                                            <div className="h-14 w-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                                                <Zap size={28} />
                                            </div>
                                            <h4 className="text-lg font-bold text-white mb-2">Enter Manually</h4>
                                            <p className="text-slate-400 text-sm leading-relaxed">Define flat rates or percentage-based tiers manually.</p>
                                        </button>

                                        <button
                                            onClick={() => setTestMode('csv')}
                                            className="p-8 rounded-3xl border border-slate-800 bg-slate-950/50 hover:bg-slate-900 hover:border-blue-500/50 transition-all text-left group"
                                        >
                                            <div className="h-14 w-14 bg-purple-600/10 rounded-2xl flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform">
                                                <Sparkles size={28} />
                                            </div>
                                            <h4 className="text-lg font-bold text-white mb-2">Upload a CSV</h4>
                                            <p className="text-slate-400 text-sm leading-relaxed">Upload a sales data export and let our AI analyze your pricing logic.</p>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => setTestMode(null)}
                                                className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-white flex items-center gap-1 transition-colors"
                                            >
                                                ← Change Pricing Method
                                            </button>
                                            <div className="px-3 py-1 bg-blue-600/10 rounded-full border border-blue-500/20">
                                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{testMode === 'manual' ? 'Manual Mode' : 'Smart Discovery'}</span>
                                            </div>
                                        </div>

                                        {testMode === 'manual' ? (
                                            <div className="space-y-6">
                                                <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-8 space-y-8">
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Manual Price Configuration</h4>

                                                        <div className="flex flex-col md:flex-row items-end gap-6">
                                                            {/* Prefilled Product Name */}
                                                            <div className="flex-1 space-y-2">
                                                                <label className="block text-[10px] font-bold text-slate-600 uppercase">Product Context</label>
                                                                <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-400 text-sm font-medium">
                                                                    {config.product_info.name || 'Untitled Product'}
                                                                </div>
                                                            </div>

                                                            {/* Pricing Levels */}
                                                            <div className="flex-[2] grid grid-cols-3 gap-3">
                                                                {[
                                                                    { key: 'price1yr', idx: 0 },
                                                                    { key: 'price2yr', idx: 1 },
                                                                    { key: 'price3yr', idx: 2 }
                                                                ].map((lvl) => (
                                                                    <div key={lvl.key} className="space-y-2">
                                                                        <input
                                                                            type="text"
                                                                            value={config.program_profile.durations[lvl.idx] || ''}
                                                                            onChange={(e) => {
                                                                                const newDurations = [...config.program_profile.durations];
                                                                                newDurations[lvl.idx] = e.target.value;
                                                                                setConfig({
                                                                                    ...config,
                                                                                    program_profile: { ...config.program_profile, durations: newDurations }
                                                                                });
                                                                            }}
                                                                            className="block w-full bg-transparent text-[10px] font-bold text-slate-600 uppercase outline-none focus:text-blue-500 transition-colors"
                                                                            placeholder="Label"
                                                                        />
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                                                            <input
                                                                                type="number"
                                                                                value={(config.program_profile.rules as any)[lvl.key] || ''}
                                                                                onChange={(e) => setConfig({
                                                                                    ...config,
                                                                                    program_profile: {
                                                                                        ...config.program_profile,
                                                                                        model: 'static',
                                                                                        rules: { ...config.program_profile.rules, [lvl.key]: parseFloat(e.target.value) }
                                                                                    }
                                                                                })}
                                                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-6 pr-3 py-3 text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm font-bold"
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center gap-3 text-blue-400/70">
                                                        <AlertCircle size={16} />
                                                        <p className="text-[11px] font-medium leading-relaxed">
                                                            These prices will be injected into the agent's logic for all calls. You can refine the specific pitch for each price point in Step 4.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 animate-in slide-in-from-top-2">
                                                {/* Re-use the existing CSV Discovery logic */}
                                                {!discoveryResults ? (
                                                    <div className="space-y-4">
                                                        <div className="border-2 border-dashed border-slate-800 rounded-3xl p-10 text-center hover:border-blue-500 transition-all cursor-pointer group relative overflow-hidden bg-slate-950/50">
                                                            <input
                                                                type="file"
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                accept=".csv"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) scanCSV(file);
                                                                }}
                                                            />
                                                            <div className="h-16 w-16 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-400 mx-auto mb-4 group-hover:scale-110 transition-all">
                                                                {discoveryLoading ? <Loader2 className="animate-spin" /> : <Upload size={32} />}
                                                            </div>
                                                            <p className="font-bold text-white text-lg">Drop your Pricing CSV here</p>
                                                            <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-2 font-black">AI will analyze columns automatically</p>
                                                        </div>

                                                        {/* CSV Example Tooltip/Visual */}
                                                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden">
                                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-4">Sample Data Structure</p>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left text-[11px]">
                                                                    <thead>
                                                                        <tr className="border-b border-slate-800 text-slate-400">
                                                                            <th className="pb-2 pr-4 font-bold">Product Name</th>
                                                                            <th className="pb-2 px-4 font-bold">1 yr Plan</th>
                                                                            <th className="pb-2 px-4 font-bold">2 yr Plan</th>
                                                                            <th className="pb-2 pl-4 font-bold whitespace-nowrap">3 yr Plan</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        <tr className="text-slate-300">
                                                                            <td className="py-2 pr-4 font-medium">USED Sony Alpha A6400 Body</td>
                                                                            <td className="py-2 px-4">99.99</td>
                                                                            <td className="py-2 px-4">139.99</td>
                                                                            <td className="py-2 pl-4">159.99</td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
                                                        <h4 className="font-bold text-blue-400 text-sm mb-2">Discovery Complete!</h4>
                                                        <p className="text-xs text-blue-200/70 leading-relaxed font-medium">{discoveryResults.explanation}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}


                        {step === 4 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <h3 className="text-xl font-bold text-white">Script Assembly</h3>
                                <p className="text-slate-400">Configure your agent's identity and sales strategy, then generate your custom script.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Identity & Strategy Card */}
                                    <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6 space-y-6">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <Phone size={12} />
                                                Agent Identity
                                            </h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Agent Name</label>
                                                    <input
                                                        type="text"
                                                        value={config.agent_name}
                                                        onChange={(e) => setConfig({ ...config, agent_name: e.target.value })}
                                                        placeholder="e.g. Claire, Sarah..."
                                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Voice</label>
                                                    <select
                                                        value={config.voice_id}
                                                        onChange={(e) => setConfig({ ...config, voice_id: e.target.value })}
                                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm capitalize"
                                                    >
                                                        <option value="paige">Paige (Neutral/Professional)</option>
                                                        <option value="claire">Claire (Warm/Engaging)</option>
                                                        <option value="josh">Josh (Direct/Trustworthy)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-800">
                                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <Shield size={12} />
                                                Sales Methodology
                                            </h4>
                                            <select
                                                value={config.agent_behavior.sales_philosophy}
                                                onChange={(e) => setConfig({ ...config, agent_behavior: { ...config.agent_behavior, sales_philosophy: e.target.value as any } })}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm capitalize"
                                            >
                                                <option value="ai_choice">AI Choice (Recommended)</option>
                                                <option value="consultative">Consultative Selling</option>
                                                <option value="challenger">Challenger Sale</option>
                                                <option value="spin">SPIN Selling</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Actions Only (No integrated Fine-Tuning) */}
                                    <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6 flex flex-col justify-end space-y-4">
                                        <div className="flex-1 flex items-center justify-center opacity-20 py-12">
                                            <Sparkles size={48} className="text-slate-500" />
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            <button
                                                onClick={handleGenerate}
                                                disabled={generating}
                                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {generating ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                                                {config.is_generated ? 'Regenerate Script' : 'Generate Script'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setTestLead({
                                                        ...testLead,
                                                        product: config.product_info.name || testLead.product,
                                                        productPrice: (config.product_info.price ? parseFloat(config.product_info.price.replace(/[^0-9.]/g, '')) : testLead.productPrice) || 1200
                                                    });
                                                    setTestMode('demo_lead');
                                                }}
                                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700 flex items-center justify-center gap-2"
                                            >
                                                <PhoneCall size={20} />
                                                Make Test Call
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {config.is_generated && (
                                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl animate-in slide-in-from-top-2">
                                        <p className="text-xs text-green-400 font-medium">Script successfully generated based on your strategy and refinements. You can preview the raw prompt in Advanced Mode or proceed to Launch.</p>
                                    </div>
                                )}
                            </div>
                        )}


                        {step === 5 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 text-center py-10">
                                <div className="mx-auto h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-6">
                                    <CheckCircle2 size={48} />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-3xl font-bold text-white">Ready for Launch</h3>
                                    <p className="text-slate-400 max-w-md mx-auto">Your campaign is perfectly configured.<br />All strategy, logic, and conversational models are synced to your company profile.</p>
                                </div>

                                <div className="flex flex-col items-center gap-4 pt-4">
                                    <button
                                        onClick={handleSaveRaw}
                                        disabled={saving}
                                        className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-2xl transition-all shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95 disabled:opacity-50"
                                    >
                                        ACTIVATE CAMPAIGN
                                    </button>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Instantly routes to your live queue</p>
                                </div>
                            </div>
                        )}

                        {/* Navigation Footer */}
                        <div className="mt-auto pt-8 flex justify-between">
                            {step > 1 && (
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="px-6 py-2 text-slate-400 hover:text-white flex items-center gap-2 font-bold"
                                >
                                    <ArrowLeft size={18} />
                                    Back
                                </button>
                            )}
                            {step < 5 && (
                                <button
                                    onClick={() => setStep(step + 1)}
                                    className="ml-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center gap-2 font-bold transition-all border border-slate-700 shadow-lg"
                                >
                                    Next Step
                                    <ChevronRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div >
            ) : (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Code className="text-blue-400" size={20} />
                                <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">Raw System Prompt Editor</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setView('wizard')}
                                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    onClick={handleSaveRaw}
                                    disabled={saving}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                >
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Save Raw Prompt
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={rawScript || ''}
                            onChange={(e) => setRawScript(e.target.value)}
                            className="w-full h-[600px] bg-slate-950 p-8 text-slate-300 font-mono text-sm leading-relaxed outline-none resize-none"
                            placeholder="Generate a campaign first or paste your system prompt here..."
                        />
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex items-start gap-4">
                        <AlertCircle className="text-amber-500 shrink-0" size={20} />
                        <p className="text-xs text-amber-500/80 leading-relaxed font-medium">
                            <strong className="text-amber-500 uppercase tracking-widest block mb-1">Warning: Advanced Mode</strong>
                            Editing the raw script bypasses the Builder wizard. Any changes saved here will be live immediately for the next call but may be overwritten if you re-generate via the Strategy tab.
                        </p>
                    </div>
                </div>
            )}

            {/* NEW TEST CALL MODAL (Clean Demo Style) */}
            {testMode === 'demo_lead' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
                        <button
                            onClick={() => setTestMode(null)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-600/20 p-2 rounded-lg">
                                    <Phone className="text-blue-400" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Make Test Call</h2>
                                    <p className="text-xs text-slate-400">Experience your agent's live pitch</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            {successMsg ? (
                                <div className="text-center py-8 animate-in zoom-in duration-300">
                                    <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50">
                                        <PhoneCall className="text-green-500" size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Connecting...</h3>
                                    <p className="text-slate-400">Your phone should ring in a moment.</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name</label>
                                        <input
                                            type="text"
                                            value={testLead.firstName}
                                            onChange={(e) => setTestLead({ ...testLead, firstName: e.target.value })}
                                            placeholder="e.g. Jane Doe"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-700 font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Mobile Phone</label>
                                        <input
                                            type="text"
                                            value={testLead.phone}
                                            onChange={(e) => setTestLead({ ...testLead, phone: e.target.value })}
                                            placeholder="+1 (555) 000-0000"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-700 font-medium"
                                        />
                                        <p className="mt-2 text-[10px] text-slate-500 italic">Call to test your script.</p>
                                    </div>

                                    <button
                                        onClick={handleTestCall}
                                        disabled={testCalling || !testLead.phone}
                                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
                                    >
                                        {testCalling ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                Dialing...
                                            </>
                                        ) : (
                                            <>
                                                Make Test Call
                                                <Phone size={20} />
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Fine-Tuning Side Overlay */}
            {showFineTuning && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setShowFineTuning(false)}
                    />

                    {/* Side Panel */}
                    <div className="relative w-1/2 h-full bg-slate-900 border-l border-slate-800 shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Sparkles className="text-blue-500" />
                                    Fine-Tune Your Agent
                                </h3>
                                <p className="text-slate-400 mt-1">Provide feedback to adjust the script and behavior.</p>
                            </div>
                            <button
                                onClick={() => setShowFineTuning(false)}
                                className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 space-y-4">
                            <textarea
                                value={config.refinement_notes || ''}
                                onChange={(e) => setConfig({ ...config, refinement_notes: e.target.value })}
                                placeholder="e.g. Don't say 'Great question', be more direct about the price..."
                                className="w-full h-full bg-slate-950/50 border border-slate-800 rounded-2xl p-6 text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all text-base resize-none leading-relaxed"
                            />
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-800">
                            <button
                                onClick={async () => {
                                    await handleGenerate();
                                    setShowSuccessModal(true);
                                }}
                                disabled={generating}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {generating ? <Loader2 className="animate-spin" size={24} /> : <Zap size={24} />}
                                Regenerate Script
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative text-center p-8">
                        <button
                            onClick={() => {
                                setShowSuccessModal(false);
                                setTestMode('demo_lead');
                            }}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50">
                            <CheckCircle2 className="text-green-500" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Script Updated!</h3>
                        <p className="text-slate-400 mb-6">Your changes have been applied.</p>
                    </div>
                </div>
            )}
        </div >
    );
};

