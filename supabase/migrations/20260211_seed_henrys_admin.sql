DO $$
DECLARE
    v_company_id uuid;
    -- REPLACE WITH YOUR ACTUAL FIREBASE UID
    v_user_uid text := 'mCSyONt6FNbHzFjIGWdd4v5BpRL2'; 
    -- v_email text := 'rbraudy@gmail.com'; -- Email column does not exist in user_profiles schema
BEGIN
    -- 1. Get or Create Company (Safe Check)
    SELECT id INTO v_company_id FROM public.companies WHERE name = 'Henry''s' LIMIT 1;
    
    IF v_company_id IS NULL THEN
        INSERT INTO public.companies (name)
        VALUES ('Henry''s')
        RETURNING id INTO v_company_id;
    END IF;

    -- 2. Link YOU to Henry's
    -- Note: user_profiles only has user_id, company_id, role. No email column.
    INSERT INTO public.user_profiles (user_id, role, company_id)
    VALUES (v_user_uid, 'admin', v_company_id)
    ON CONFLICT (user_id) 
    DO UPDATE SET company_id = v_company_id, role = 'admin';

    -- 3. "Adopt" the Orphans
    UPDATE public.warranty_prospects
    SET company_id = v_company_id
    WHERE company_id IS NULL;
    
    RAISE NOTICE 'Admin linked to company ID: %', v_company_id;
END $$;
