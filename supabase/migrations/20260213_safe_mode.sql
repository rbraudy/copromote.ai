-- SAFE MODE RECOVERY
-- RUN THIS TO STOP ALL RECURSION AND RESTORE ACCESS IMMEDIATELY

-- 1. DROP ALL POTENTIALLY LOOPING POLICIES
DROP POLICY IF EXISTS "individual_read" ON public.user_profiles;
DROP POLICY IF EXISTS "company_read" ON public.user_profiles;
DROP POLICY IF EXISTS "prospect_access" ON public.warranty_prospects;
DROP POLICY IF EXISTS "template_access" ON public.call_templates;
DROP POLICY IF EXISTS "company_access" ON public.companies;
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

-- 2. DISABLE RLS ON ALL CORE TABLES
-- This removes all security checks and allows the dashboard to load immediately.
-- We can re-enable security once the "infinite loop" is gone.
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_prospects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs DISABLE ROW LEVEL SECURITY;

-- 3. ENSURE YOUR PROFILE IS VALID
UPDATE public.user_profiles
SET role = 'superadmin'
WHERE user_id = 'fd32e5b4-adef-4213-b839-3c95fdb49853'; -- ID from your console
