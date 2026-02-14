-- FINAL RLS RESET AND HARDENING
-- This migration drops ALL variations of policies that have been created
-- to resolve the "infinite recursion" error once and for all.

-- 1. DROP ALL POTENTIAL POLICIES ON USER_PROFILES
DROP POLICY IF EXISTS "allow_individual_read" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_company_read" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles are viewable by company members" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles are updatable by admins" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view team profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Superadmins view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view teammates" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update team profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update their company profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Company Admins can update team profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Superadmins can update any profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles in their company" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_company_read" ON public.user_profiles;

-- 2. DROP ALL POTENTIAL POLICIES ON WARRANTY_PROSPECTS
DROP POLICY IF EXISTS "prospect_isolation" ON public.warranty_prospects;
DROP POLICY IF EXISTS "prospect_access" ON public.warranty_prospects;
DROP POLICY IF EXISTS "Users can view company prospects" ON public.warranty_prospects;
DROP POLICY IF EXISTS "Users can view/edit company prospects" ON public.warranty_prospects;

-- 3. DROP ALL POTENTIAL POLICIES ON CALL_TEMPLATES
DROP POLICY IF EXISTS "template_isolation" ON public.call_templates;
DROP POLICY IF EXISTS "template_access" ON public.call_templates;
DROP POLICY IF EXISTS "Users can view company templates" ON public.call_templates;

-- 4. DROP ALL POTENTIAL POLICIES ON COMPANIES
DROP POLICY IF EXISTS "company_isolation" ON public.companies;
DROP POLICY IF EXISTS "company_access" ON public.companies;
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

-- 5. RE-DEFINE HELPER FUNCTIONS (SECURITY DEFINER)
-- This is the key to avoiding recursion.
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT company_id 
        FROM public.user_profiles 
        WHERE user_id = auth.uid()::text 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'superadmin'
        FROM public.user_profiles
        WHERE user_id = auth.uid()::text
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. APPLY CLEAN, NON-RECURSIVE POLICIES

-- USER_PROFILES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_select_policy" ON public.user_profiles
    FOR SELECT USING (
        auth.uid()::text = user_id 
        OR company_id = public.get_my_company_id() 
        OR public.is_superadmin()
    );

CREATE POLICY "profile_update_policy" ON public.user_profiles
    FOR UPDATE USING (
        auth.uid()::text = user_id 
        OR (company_id = public.get_my_company_id() AND EXISTS (
            SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid()::text AND role = 'admin'
        ))
        OR public.is_superadmin()
    );

-- WARRANTY_PROSPECTS
ALTER TABLE public.warranty_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospect_all_policy" ON public.warranty_prospects
    FOR ALL USING (
        company_id = public.get_my_company_id()
        OR public.is_superadmin()
    );

-- CALL_TEMPLATES
ALTER TABLE public.call_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_all_policy" ON public.call_templates
    FOR ALL USING (
        company_id = public.get_my_company_id()
        OR public.is_superadmin()
    );

-- COMPANIES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_select_policy" ON public.companies
    FOR SELECT USING (
        id = public.get_my_company_id()
        OR public.is_superadmin()
    );

-- 7. NOTIFY
DO $$
BEGIN
    RAISE NOTICE 'Permanent RLS fix applied for all core tables.';
END $$;
