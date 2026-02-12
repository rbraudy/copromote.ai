-- Enable Tenant Configuration for Branding

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.tenant_config (
    company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    domain TEXT UNIQUE, -- e.g. "henrys", "bestbuy"
    brand_name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3b82f6', -- Default Blue
    secondary_color TEXT DEFAULT '#1e293b', -- Default Slate
    support_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.tenant_config ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- A. PUBLIC READ (For Login Page)
-- Allow anyone to read tenant config if they know the ID or Domain.
-- This is safe because it's just branding info.
CREATE POLICY "Public can view tenant config" 
    ON public.tenant_config 
    FOR SELECT 
    USING (true);

-- B. ADMIN WRITE (For Settings Page)
-- Only Admins of that company or Superadmins can update.
CREATE POLICY "Admins can update tenant config" 
    ON public.tenant_config 
    FOR UPDATE 
    USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles 
            WHERE user_id = auth.uid()::text AND (role = 'admin' OR role = 'superadmin')
        )
        OR 
        public.is_superadmin()
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_profiles 
            WHERE user_id = auth.uid()::text AND (role = 'admin' OR role = 'superadmin')
        )
        OR 
        public.is_superadmin()
    );

-- C. INSERT (Superadmin or Initial System)
CREATE POLICY "Superadmins can insert tenant config" 
    ON public.tenant_config 
    FOR INSERT 
    WITH CHECK (public.is_superadmin());


-- 4. Seed Data function (Optional helper)
-- Automatically create config when a company is created? 
-- For now, let's just insert one for Henry's if it exists.

DO $$
DECLARE
    v_henrys_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
BEGIN
    INSERT INTO public.tenant_config (company_id, domain, brand_name, primary_color)
    VALUES (v_henrys_id, 'henrys', 'Henry''s Camera', '#ef4444') -- Red for Henry's
    ON CONFLICT (company_id) DO NOTHING;
END $$;
