-- 1. Drop the problematic recursive policies
DROP POLICY IF EXISTS "Users can view all profiles in their company" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update team profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;

-- 2. Create a very simple "View Own Profile" policy (Base case)
-- This is NOT recursive because it only checks the auth.uid() against the user_id column
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid()::text = user_id);

-- 3. Create a policy for Superadmins (View All)
CREATE POLICY "Superadmins view all profiles"
    ON public.user_profiles FOR SELECT
    USING (public.is_superadmin());

-- 4. Create a policy for viewing company teammates
-- We use a subquery that is restricted to a simple check to avoid infinite recursion
CREATE POLICY "Users can view teammates"
    ON public.user_profiles FOR SELECT
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.user_profiles 
            WHERE user_id = auth.uid()::text
        )
    );

-- 5. Admin edit policy
CREATE POLICY "Admins can update their company profiles"
    ON public.user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid()::text
            AND (role = 'admin' OR role = 'superadmin')
            AND (company_id = user_profiles.company_id OR role = 'superadmin')
        )
    );

-- 6. Enable RLS (Ensure it's on)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
