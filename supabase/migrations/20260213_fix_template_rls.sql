-- Fixed: Cast auth.uid() to text because user_profiles.user_id is TEXT
DROP POLICY IF EXISTS "Admins can view own template" ON public.call_templates;
DROP POLICY IF EXISTS "Company members can view own template" ON public.call_templates;

CREATE POLICY "Company members can view own template" ON public.call_templates
    FOR SELECT USING (
        company_id IN (
            SELECT company_id 
            FROM public.user_profiles 
            WHERE user_id = auth.uid()::text -- Cast UUID to text to match column type
        )
        OR public.is_superadmin()
    );

-- Keep UPDATE restricted to admins
DROP POLICY IF EXISTS "Admins can update own template" ON public.call_templates;

CREATE POLICY "Admins can update own template" ON public.call_templates
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id 
            FROM public.user_profiles 
            WHERE user_id = auth.uid()::text 
              AND (role = 'admin' OR role = 'superadmin')
        )
        OR public.is_superadmin()
    );
