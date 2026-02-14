-- 1. Create a helper function to get the current user's company_id
-- This function skips RLS by being SECURITY DEFINER
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

-- 2. Create a helper function to check if the current user is a superadmin
-- This avoids recursion in policies
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

-- 3. Reset user_profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view roommates" ON public.user_profiles;
DROP POLICY IF EXISTS "Superadmins view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view teammates" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update their company profiles" ON public.user_profiles;

-- Simplest possible non-recursive policies for profiles
CREATE POLICY "Profiles are viewable by company members"
    ON public.user_profiles FOR SELECT
    USING (
        auth.uid()::text = user_id -- Can always see yourself
        OR company_id = public.get_my_company_id() -- Can see teammates
        OR public.is_superadmin() -- Superadmin can see all
    );

CREATE POLICY "Profiles are updatable by admins"
    ON public.user_profiles FOR UPDATE
    USING (
        (auth.uid()::text = user_id) -- Can edit yourself
        OR (company_id = public.get_my_company_id() AND EXISTS (
            SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid()::text AND role = 'admin'
        ))
        OR public.is_superadmin()
    );

-- 4. Fix warranty_prospects policies (Ensures they reappear on dashboard)
DROP POLICY IF EXISTS "Users can view company prospects" ON public.warranty_prospects;
CREATE POLICY "Users can view company prospects"
    ON public.warranty_prospects FOR SELECT
    USING (
        company_id = public.get_my_company_id()
        OR public.is_superadmin()
    );

-- 5. Fix call_templates policies (Ensures Campaign Dashboard works)
DROP POLICY IF EXISTS "Users can view company templates" ON public.call_templates;
CREATE POLICY "Users can view company templates"
    ON public.call_templates FOR SELECT
    USING (
        company_id = public.get_my_company_id()
        OR public.is_superadmin()
    );

-- 6. Fix companies policies
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
CREATE POLICY "Users can view own company"
    ON public.companies FOR SELECT
    USING (
        id = public.get_my_company_id()
        OR public.is_superadmin()
    );
