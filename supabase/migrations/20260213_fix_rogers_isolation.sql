-- 1. Create a new organization for Rogers/Generic testing
DO $$
DECLARE
    v_new_company_id UUID := gen_random_uuid();
    v_user_email TEXT := 'rbraudy@rogers.com';
    v_user_id TEXT;
BEGIN
    -- Get the User ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;

    IF v_user_id IS NOT NULL THEN
        -- Create the new Company
        INSERT INTO public.companies (id, name)
        VALUES (v_new_company_id, 'Rogers Custom Demo')
        ON CONFLICT DO NOTHING;

        -- Update the User Profile to point to the new company
        -- And demote from superadmin if they were accidentally promoted, or just set to admin
        UPDATE public.user_profiles
        SET company_id = v_new_company_id,
            role = 'admin'
        WHERE user_id = v_user_id;

        RAISE NOTICE 'User % moved to Rogers Custom Demo (%)', v_user_email, v_new_company_id;
    ELSE
        RAISE NOTICE 'User % not found. No isolation fix applied.', v_user_email;
    END IF;
END $$;
