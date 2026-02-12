-- Phase 3: Generic Engine Schema

-- 1. Create call_templates table
CREATE TABLE IF NOT EXISTS public.call_templates (
    company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    vapi_assistant_id TEXT, -- Optional override if using a specific Vapi ID
    system_prompt TEXT NOT NULL, -- The main LLM instructions
    first_message TEXT, -- The opening line
    voice_id TEXT DEFAULT 'paige', -- Default Vapi voice
    tools_config JSONB DEFAULT '[]'::jsonb, -- Array of enabled tools e.g. ["checkShipping", "scheduleRepair"]
    analysis_schema JSONB, -- Optional JSON schema for call analysis
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create integrations table
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'shopify', 'eshipper', 'zendesk'
    credentials JSONB, -- Encrypted or Masked API keys
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, provider)
);

-- 3. Enable RLS
ALTER TABLE public.call_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Call Templates:
-- Admins can VIEW and UDPATE their own template
CREATE POLICY "Admins can view own template" ON public.call_templates
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles 
            WHERE user_id = auth.uid()::text AND (role = 'admin' OR role = 'superadmin')
        )
        OR public.is_superadmin()
    );

CREATE POLICY "Admins can update own template" ON public.call_templates
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles 
            WHERE user_id = auth.uid()::text AND (role = 'admin' OR role = 'superadmin')
        )
        OR public.is_superadmin()
    );
    
-- Integrations:
-- Admins can VIEW and UDPATE their own integrations
CREATE POLICY "Admins can view own integrations" ON public.integrations
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles 
            WHERE user_id = auth.uid()::text AND (role = 'admin' OR role = 'superadmin')
        )
        OR public.is_superadmin()
    );

CREATE POLICY "Admins can update own integrations" ON public.integrations
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles 
            WHERE user_id = auth.uid()::text AND (role = 'admin' OR role = 'superadmin')
        )
        OR public.is_superadmin()
    );

-- Superadmin Insert
CREATE POLICY "Superadmins can insert templates" ON public.call_templates
    FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins can insert integrations" ON public.integrations
    FOR INSERT WITH CHECK (public.is_superadmin());

-- Edge Function Access (Service Role)
-- Supabase Service Role bypasses RLS, so no policy needed strictly for the function itself 
-- if it uses the service key. But if we use RLS-enabled client in Edge Function, we need:
-- We'll assume the Edge Function uses Service Role Key which bypasses RLS.
