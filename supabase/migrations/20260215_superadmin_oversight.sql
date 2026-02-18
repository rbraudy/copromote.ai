-- Superadmin Role Elevation & Test Data Seeding
DO $$
DECLARE
    v_user_email TEXT := 'rbraudy@gmail.com';
    v_user_id TEXT;
    v_henrys_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
BEGIN
    -- 1. Identify Superadmin User
    SELECT id::text INTO v_user_id FROM auth.users WHERE email = v_user_email;

    IF v_user_id IS NOT NULL THEN
        -- 2. Elevate to Superadmin
        INSERT INTO public.user_profiles (user_id, role, company_id)
        VALUES (v_user_id, 'superadmin', v_henrys_id)
        ON CONFLICT (user_id) DO UPDATE SET role = 'superadmin';

        RAISE NOTICE 'User % elevated to superadmin.', v_user_email;
    ELSE
        RAISE NOTICE 'User % not found in auth.users.', v_user_email;
    END IF;

    -- 3. Ensure Henry's Company is correctly named for consistency
    INSERT INTO public.companies (id, name)
    VALUES (v_henrys_id, 'Henry''s Camera')
    ON CONFLICT (id) DO UPDATE SET name = 'Henry''s Camera';

    -- 4. Create a Second Demo Company if it doesn't exist
    INSERT INTO public.companies (id, name)
    VALUES ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Demo Company B')
    ON CONFLICT (id) DO NOTHING;

    -- 5. Link Test Script to Demo Company B for verification
    INSERT INTO public.call_templates (company_id, system_prompt)
    VALUES ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'You are a test agent for Demo Company B.')
    ON CONFLICT (company_id) DO NOTHING;

    INSERT INTO public.campaign_configs (company_id, is_generated)
    VALUES ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true)
    ON CONFLICT (company_id) DO NOTHING;

END $$;
