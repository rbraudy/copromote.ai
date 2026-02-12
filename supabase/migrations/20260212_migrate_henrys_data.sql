-- 1. Correct the User Profile to point to the EXISTING Henry's Company
-- (The Trigger likely created a duplicate company named "Henry's" or similar)

DO $$
DECLARE
    v_existing_company_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; -- The hardcoded ID we used before
    v_user_email TEXT := 'admin@henrys.com'; -- The email you just signed up with
    v_new_user_id TEXT;
    v_duplicate_company_id UUID;
BEGIN
    -- Get the ID of the new Supabase Auth user
    SELECT id INTO v_new_user_id
    FROM auth.users
    WHERE email = v_user_email;

    -- Improve safety: Only proceed if user exists
    IF v_new_user_id IS NOT NULL THEN
        
        -- Get the company_id that the trigger assigned to this user
        SELECT company_id INTO v_duplicate_company_id
        FROM public.user_profiles
        WHERE user_id = v_new_user_id;

        -- Update the user to point to the ORIGINAL Henry's Company
        UPDATE public.user_profiles
        SET company_id = v_existing_company_id,
            role = 'admin'
        WHERE user_id = v_new_user_id;

        -- If a duplicate company was created, delete it to keep things clean
        IF v_duplicate_company_id <> v_existing_company_id THEN
            DELETE FROM public.companies WHERE id = v_duplicate_company_id;
        END IF;

        -- Migrating existing data: ensure all prospects belong to Henry's
        -- (This might already be true, but good to be safe)
        UPDATE public.warranty_prospects
        SET company_id = v_existing_company_id
        WHERE company_id IS NULL OR company_id <> v_existing_company_id;

        RAISE NOTICE 'Migration Complete: User % linked to Company %', v_new_user_id, v_existing_company_id;
    ELSE
        RAISE NOTICE 'User % not found. Did you sign up yet?', v_user_email;
    END IF;
END $$;
