-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_profiles table (Links Firebase Auth ID to Company)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id TEXT PRIMARY KEY, -- Matches Firebase UID
    company_id UUID REFERENCES public.companies(id),
    role TEXT DEFAULT 'agent', -- 'admin', 'agent'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add company_id to warranty_prospects
ALTER TABLE public.warranty_prospects 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Enable RLS on new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- company policies
CREATE POLICY "Users can view their own company" ON public.companies
    FOR SELECT USING (
        id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text)
    );

-- user_profile policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (user_id = auth.uid()::text);

-- Update warranty_prospects policies to allow company-wide access
-- Drop old policy if it conflicts or just add new one
DROP POLICY IF EXISTS "Users can manage their own warranty prospects" ON public.warranty_prospects;

CREATE POLICY "Users can view/edit company prospects" ON public.warranty_prospects
    FOR ALL USING (
        company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text)
    )
    WITH CHECK (
        company_id IN (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text)
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_warranty_prospects_company ON public.warranty_prospects(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON public.user_profiles(company_id);
