-- Fix permissions and RLS for campaign_configs
BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE public.campaign_configs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts/recursion
DROP POLICY IF EXISTS "Users can view their own campaign config" ON public.campaign_configs;
DROP POLICY IF EXISTS "Admins can manage their own campaign config" ON public.campaign_configs;
DROP POLICY IF EXISTS "Service role has full access" ON public.campaign_configs;

-- 3. Create simple, non-recursive policies
-- Allow users to view configs for companies they belong to
CREATE POLICY "Users can view their own campaign config"
ON public.campaign_configs FOR SELECT
USING (
  (SELECT auth.uid()) IS NOT NULL  -- User must be logged in
  AND (
    -- User belongs to the company
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()::text
      AND user_profiles.company_id = campaign_configs.company_id
    )
    OR 
    -- User is superadmin
    public.is_superadmin()
  )
);

-- Allow admins/superadmins to fully manage configs
CREATE POLICY "Admins can manage their own campaign config"
ON public.campaign_configs FOR ALL
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()::text
      AND user_profiles.company_id = campaign_configs.company_id
      AND (user_profiles.role = 'admin' OR user_profiles.role = 'superadmin')
    )
    OR public.is_superadmin()
  )
);

-- 4. Grant explicit permissions to roles
GRANT ALL ON public.campaign_configs TO service_role;
GRANT ALL ON public.campaign_configs TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_configs TO authenticated;
GRANT SELECT ON public.campaign_configs TO anon; -- Required if public lookup needed, otherwise restrict

-- 5. Notify Schema Cache reload
NOTIFY pgrst, 'reload schema';

COMMIT;
