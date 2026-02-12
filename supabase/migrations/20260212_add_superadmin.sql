-- 1. Promote 'rbraudy@gmail.com' to Superadmin
-- Note: User must have signed up first!
DO $$
DECLARE
    v_user_email TEXT := 'rbraudy@gmail.com';
    v_user_id TEXT;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;

    IF v_user_id IS NOT NULL THEN
        -- Update the user_profile role
        UPDATE public.user_profiles
        SET role = 'superadmin'
        WHERE user_id = v_user_id;

        RAISE NOTICE 'User % (%s) promoted to Superadmin', v_user_email, v_user_id;
    ELSE
        RAISE NOTICE 'User % not found. Please sign up first!', v_user_email;
    END IF;
END $$;


-- 2. Update RLS Policies to allow Superadmin access

-- A. Company Access (Superadmin sees ALL companies)
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
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
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid()::text AND role = 'superadmin'
        )
    );

-- B. User Profiles Access (Superadmin sees ALL profiles)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users and Superadmins can view profiles"
    ON public.user_profiles
    FOR SELECT
    USING (
        auth.uid()::text = user_id
        OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid()::text AND role = 'superadmin'
        )
    );

-- C. Prospects Access (Superadmin sees ALL prospects)
DROP POLICY IF EXISTS "Users can view company prospects" ON public.warranty_prospects;
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
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid()::text AND role = 'superadmin'
        )
    );
