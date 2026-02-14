-- Fix Call Logs RLS to allow Company Admins and Superadmins to view data
-- Previously restricted to only the 'seller_id' (the user who uploaded the lead)

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view logs of their warranty prospects" ON public.call_logs;
DROP POLICY IF EXISTS "Users can view their own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can insert logs for their prospects" ON public.call_logs;

-- 2. Create READ Policy (Select)
CREATE POLICY "Admins and Sellers can view call logs"
    ON public.call_logs
    FOR SELECT
    USING (
        -- 1. Superadmin can see everything
        public.is_superadmin()
        OR
        -- 2. User is the Seller (Direct owner of the prospect)
        EXISTS (
            SELECT 1 FROM public.warranty_prospects wp
            WHERE wp.id = public.call_logs.warranty_prospect_id
            AND wp.seller_id = auth.uid()::text
        )
        OR
        -- 3. User is an Admin for the Company that owns the prospect
        EXISTS (
            SELECT 1 FROM public.warranty_prospects wp
            JOIN public.companies c ON wp.company_id = c.id
            JOIN public.user_profiles up ON c.id = up.company_id
            WHERE wp.id = public.call_logs.warranty_prospect_id
            AND up.user_id = auth.uid()::text
            AND (up.role = 'admin' OR up.role = 'superadmin')
        )
    );

-- 3. Create WRITE Policy (Insert) - Mostly for Edge Functions/Service Role, but good for testing
CREATE POLICY "Admins and Sellers can insert call logs"
    ON public.call_logs
    FOR INSERT
    WITH CHECK (
        -- 1. Superadmin
        public.is_superadmin()
        OR
        -- 2. Seller
        EXISTS (
            SELECT 1 FROM public.warranty_prospects wp
            WHERE wp.id = public.call_logs.warranty_prospect_id
            AND wp.seller_id = auth.uid()::text
        )
        OR
        -- 3. Company Admin
        EXISTS (
            SELECT 1 FROM public.warranty_prospects wp
            JOIN public.user_profiles up ON wp.company_id = up.company_id
            WHERE wp.id = public.call_logs.warranty_prospect_id
            AND up.user_id = auth.uid()::text
            AND (up.role = 'admin' OR up.role = 'superadmin')
        )
    );
