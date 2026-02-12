-- 1. Link Superadmin to Henry's Company & Data
DO $$
DECLARE
    v_henrys_company_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; -- The hardcoded ID for Henry's
    v_user_email TEXT := 'rbraudy@gmail.com';
    v_user_id TEXT;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;

    IF v_user_id IS NOT NULL THEN
        
        -- 1. Ensure Company Exists (or insert it if missing from a fresh db)
        INSERT INTO public.companies (id, name)
        VALUES (v_henrys_company_id, 'Henry''s Camera')
        ON CONFLICT (id) DO NOTHING;

        -- 2. Link User to Henry's
        UPDATE public.user_profiles
        SET company_id = v_henrys_company_id,
            role = 'superadmin'
        WHERE user_id = v_user_id;

        -- 3. Link ORPHANED prospects to Henry's (Data Migration)
        UPDATE public.warranty_prospects
        SET company_id = v_henrys_company_id
        WHERE company_id IS NULL;

        RAISE NOTICE 'Migration Complete: Superadmin linked to Henrys';
    ELSE
        RAISE NOTICE 'User % not found.', v_user_email;
    END IF;
END $$;
