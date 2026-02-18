-- Create campaign_configs table to store structured campaign settings
CREATE TABLE IF NOT EXISTS public.campaign_configs (
    company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    system_template_id UUID REFERENCES public.system_templates(id) ON DELETE SET NULL,
    product_info JSONB DEFAULT '{}'::jsonb,
    agent_behavior JSONB DEFAULT '{}'::jsonb,
    special_offers JSONB DEFAULT '{}'::jsonb,
    is_generated BOOLEAN DEFAULT false,
    test_calls_count INTEGER DEFAULT 0,
    is_live BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_configs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own campaign config"
    ON public.campaign_configs FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles 
            WHERE user_id = auth.uid()::text
        )
        OR public.is_superadmin()
    );

CREATE POLICY "Admins can manage their own campaign config"
    ON public.campaign_configs FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles 
            WHERE user_id = auth.uid()::text AND (role = 'admin' OR role = 'superadmin')
        )
        OR public.is_superadmin()
    );
