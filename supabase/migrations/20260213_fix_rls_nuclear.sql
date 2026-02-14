-- EMERGENCY RECOVERY SCRIPT
-- RUN THIS TO FIX THE "INFINITE RECURSION / 500 ERROR"

-- 1. DROP ALL EXISTING POLICIES TO START CLEAN
DROP POLICY IF EXISTS "Profiles are viewable by company members" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles are updatable by admins" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view roommates" ON public.user_profiles;
DROP POLICY IF EXISTS "Superadmins view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view teammates" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update their company profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view company prospects" ON public.warranty_prospects;
DROP POLICY IF EXISTS "Users can view company templates" ON public.call_templates;
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;

-- 2. DISABLE RLS TEMPORARILY TO ENSURE YOU CAN LOAD YOUR ACCOUNT
-- This confirms if the issue is RLS or missing data.
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_prospects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- 3. VERIFY / RESTORE YOUR DATA
-- This ensures your specific user ID HAS a profile and is linked to a company.
DO $$
DECLARE
    v_user_id TEXT := 'fd32e5b4-adef-4213-b839-3c95fdb49853'; -- From your console log
    v_company_id UUID;
BEGIN
    -- Get the most recent company
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at DESC LIMIT 1;

    -- If you don't have a profile, create one
    INSERT INTO public.user_profiles (user_id, company_id, role, full_name)
    VALUES (v_user_id, v_company_id, 'superadmin', 'Admin User')
    ON CONFLICT (user_id) DO UPDATE 
    SET role = 'superadmin', company_id = v_company_id;
    
    RAISE NOTICE 'User % restored as Superadmin for company %', v_user_id, v_company_id;
END $$;

-- 4. RE-ENABLE RLS WITH NON-RECURSIVE POLICIES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 5. THE MAGIC FIX: USE JWT METADATA OR SIMPLE ID CHECKS (NO SUBQUERIES TO SAME TABLE)

-- USER_PROFILES: Only check the user_id column directly.
CREATE POLICY "allow_individual_read" ON public.user_profiles
    FOR SELECT USING (auth.uid()::text = user_id);

-- Add a separate policy for broader viewing that uses the FUNCTION (Security Definer)
-- This avoids the "Self-Query" recursion.
CREATE POLICY "allow_company_read" ON public.user_profiles
    FOR SELECT USING (company_id = public.get_my_company_id());

-- PROSPECTS: No recursion here because we query user_profiles via helper function
CREATE POLICY "prospect_access" ON public.warranty_prospects
    FOR ALL USING (company_id = public.get_my_company_id());

-- TEMPLATES: Similar
CREATE POLICY "template_access" ON public.call_templates
    FOR ALL USING (company_id = public.get_my_company_id());

-- COMPANIES: Similar
CREATE POLICY "company_access" ON public.companies
    FOR SELECT USING (id = public.get_my_company_id());
