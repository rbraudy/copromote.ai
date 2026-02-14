-- 1. RE-ENABLE RLS ON CORE TABLES
-- This fixes the data leakage where users can see each other's prospects/scripts.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. DROP OLD POLICIES TO START FRESH
DROP POLICY IF EXISTS "allow_individual_read" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_company_read" ON public.user_profiles;
DROP POLICY IF EXISTS "prospect_access" ON public.warranty_prospects;
DROP POLICY IF EXISTS "template_access" ON public.call_templates;
DROP POLICY IF EXISTS "company_access" ON public.companies;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles are viewable by company members" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles are updatable by admins" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view company prospects" ON public.warranty_prospects;
DROP POLICY IF EXISTS "Users can view company templates" ON public.call_templates;
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Superadmins view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view teammates" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update their company profiles" ON public.user_profiles;

-- 3. APPLY HARDENED, NON-RECURSIVE POLICIES

-- Profiles: You can see yourself, your teammates, and Superadmins can see everyone
CREATE POLICY "profile_isolation" ON public.user_profiles
    FOR SELECT USING (
        auth.uid()::text = user_id 
        OR company_id = public.get_my_company_id() 
        OR public.is_superadmin()
    );

-- Prospects: Strictly isolated by company_id
CREATE POLICY "prospect_isolation" ON public.warranty_prospects
    FOR ALL USING (
        company_id = public.get_my_company_id()
        OR public.is_superadmin()
    );

-- Templates: Strictly isolated by company_id
CREATE POLICY "template_isolation" ON public.call_templates
    FOR ALL USING (
        company_id = public.get_my_company_id()
        OR public.is_superadmin()
    );

-- Companies: You can only see your own company record
CREATE POLICY "company_isolation" ON public.companies
    FOR SELECT USING (
        id = public.get_my_company_id()
        OR public.is_superadmin()
    );

DO $$
BEGIN
    RAISE NOTICE 'RLS Hardened security applied successfully.';
END $$;
