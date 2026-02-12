-- FIX: Avoid Infinite Recursion in RLS Policies
-- The previous policies queried 'user_profiles' to check for 'superadmin', which triggered the 'user_profiles' policy again... loop!

-- 1. Create a Helper Function to Check Role (Bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE user_id = auth.uid()::text
        AND role = 'superadmin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
-- SECURITY DEFINER is critical: it runs with the privileges of the creator (postgres/admin), 
-- ignoring RLS on the table it queries.

-- 2. Update 'user_profiles' Policy to use the function
DROP POLICY IF EXISTS "Users and Superadmins can view profiles" ON public.user_profiles;
CREATE POLICY "Users and Superadmins can view profiles"
    ON public.user_profiles
    FOR SELECT
    USING (
        user_id = auth.uid()::text -- Own profile
        OR
        public.is_superadmin()     -- Superadmin access (no recursion thanks to SECURITY DEFINER)
    );

-- 3. Update 'companies' Policy
DROP POLICY IF EXISTS "Users can view own or all (superadmin)" ON public.companies;
CREATE POLICY "Users can view own or all (superadmin)"
    ON public.companies
    FOR SELECT
    USING (
        id IN (
            SELECT company_id 
            FROM public.user_profiles 
            WHERE user_id = auth.uid()::text
        )
        OR 
        public.is_superadmin()
    );

-- 4. Update 'warranty_prospects' Policy
DROP POLICY IF EXISTS "Users and Superadmins can view prospects" ON public.warranty_prospects;
CREATE POLICY "Users and Superadmins can view prospects"
    ON public.warranty_prospects
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.user_profiles 
            WHERE user_id = auth.uid()::text
        )
        OR
        public.is_superadmin()
    );
