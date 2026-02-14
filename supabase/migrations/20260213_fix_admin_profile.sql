-- Fix for: "Campaign Builder is stuck loading"
-- Cause: rbraudy@gmail.com exists in Auth, but has no row in public.user_profiles, so company_id is null.

DO $$
DECLARE
    v_user_id TEXT;
    v_company_id UUID;
    v_email TEXT := 'rbraudy@gmail.com';
BEGIN
    -- 1. Get User ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User % not found in auth.users. Please sign up first.', v_email;
    END IF;

    -- 2. Get or Create "CoPromote Platform" Company
    -- Try to find existing first
    SELECT id INTO v_company_id FROM public.companies WHERE name = 'CoPromote Platform' LIMIT 1;
    
    -- If not found, create it
    IF v_company_id IS NULL THEN
        INSERT INTO public.companies (name) VALUES ('CoPromote Platform') RETURNING id INTO v_company_id;
        RAISE NOTICE 'Created new company: CoPromote Platform';
    END IF;

    -- 3. Upsert User Profile
    INSERT INTO public.user_profiles (user_id, company_id, role)
    VALUES (v_user_id, v_company_id, 'superadmin')
    ON CONFLICT (user_id) DO UPDATE
    SET 
        company_id = EXCLUDED.company_id,
        role = 'superadmin';

    RAISE NOTICE 'Fixed profile for user % (Superadmin)', v_email;

END $$;
