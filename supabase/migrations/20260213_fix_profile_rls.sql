-- Fix user_profiles RLS to allow Admins/Members to see their team, and Superadmins to see everyone.

-- Drop the restrictive "Own profile only" policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;

-- Create broad "View Team" policy
CREATE POLICY "Users can view team profiles" ON public.user_profiles
    FOR SELECT USING (
        company_id IN (
            SELECT company_id 
            FROM public.user_profiles 
            WHERE user_id = auth.uid()::text
        )
        OR public.is_superadmin()
    );

-- Allow Superadmins to UPDATE any profile (e.g. promoting someone to admin)
CREATE POLICY "Superadmins can update any profile" ON public.user_profiles
    FOR UPDATE USING (public.is_superadmin());

-- Allow Company Admins to UPDATE their team's profiles (e.g. changing roles)
CREATE POLICY "Company Admins can update team profiles" ON public.user_profiles
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id 
            FROM public.user_profiles 
            WHERE user_id = auth.uid()::text 
              AND (role = 'admin' OR role = 'superadmin')
        )
    );
