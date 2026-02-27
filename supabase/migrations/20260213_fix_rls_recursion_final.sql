-- 1. DROP ALL PROBLEMATIC POLICIES
DROP POLICY IF EXISTS "profile_isolation" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_individual_read" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_company_read" ON public.user_profiles;
DROP POLICY IF EXISTS "Superadmins view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users and Superadmins can view profiles" ON public.user_profiles;

-- 2. REDEFINE HELPER FUNCTIONS (Explicit search_path to avoid any ambiguity)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

-- 3. APPLY NON-RECURSIVE POLICIES FOR USER_PROFILES
-- The trick is to have one base policy for the user themselves that doesn't call any functions.
CREATE POLICY "user_profiles_self" ON public.user_profiles
    FOR SELECT USING (auth.uid()::text = user_id);

-- This policy calls the function which uses SECURITY DEFINER to bypass RLS
CREATE POLICY "user_profiles_teammates" ON public.user_profiles
    FOR SELECT USING (company_id = public.get_my_company_id());

-- This policy calls the function which uses SECURITY DEFINER to bypass RLS
CREATE POLICY "user_profiles_superadmin" ON public.user_profiles
    FOR SELECT USING (public.is_superadmin());

-- 4. ENSURE RLS IS ON
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. APPLY ANALOGOUS FIX TO OTHER TABLES
-- (Prospects, Templates, etc already use the functions so they should be safer, 
-- but we ensure they reference the hardened functions)

DROP POLICY IF EXISTS "prospect_isolation" ON public.warranty_prospects;
CREATE POLICY "prospect_isolation" ON public.warranty_prospects
    FOR ALL USING (
        company_id = public.get_my_company_id()
        OR public.is_superadmin()
    );

DROP POLICY IF EXISTS "template_isolation" ON public.call_templates;
CREATE POLICY "template_isolation" ON public.call_templates
    FOR ALL USING (
        company_id = public.get_my_company_id()
        OR public.is_superadmin()
    );

DO $$
BEGIN
    RAISE NOTICE 'RLS Recursion Fixed.';
END $$;
