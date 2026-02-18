-- Force schema cache reload and permission fix
BEGIN;

-- Explicitly notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Ensure table ownership and grants are correct
ALTER TABLE public.campaign_configs OWNER TO postgres;

-- Grant ALL to authenticated and anon (temporarily broadly to debug)
GRANT ALL ON public.campaign_configs TO authenticated;
GRANT ALL ON public.campaign_configs TO anon;
GRANT ALL ON public.campaign_configs TO service_role;

-- Re-enable RLS but ensure policy exists
ALTER TABLE public.campaign_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies just in case of stale cache references
DROP POLICY IF EXISTS "Users can view their own campaign config" ON public.campaign_configs;
DROP POLICY IF EXISTS "Admins can manage their own campaign config" ON public.campaign_configs;

-- Re-create a single, very simple policy for now
CREATE POLICY "Users can access own company config"
ON public.campaign_configs
FOR ALL
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()::text
      AND user_profiles.company_id = campaign_configs.company_id
    )
    OR public.is_superadmin()
  )
);

COMMIT;
