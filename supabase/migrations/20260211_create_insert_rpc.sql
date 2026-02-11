-- Create a secure RPC function for inserting prospects (since auth.uid() is null for Firebase users)
CREATE OR REPLACE FUNCTION create_prospect(
    p_user_id text,
    p_prospect jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id uuid;
    v_new_id uuid;
BEGIN
    -- 1. Validate User & Get Company
    SELECT company_id INTO v_company_id
    FROM public.user_profiles
    WHERE user_id = p_user_id;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'User % does not belong to a valid company.', p_user_id;
    END IF;

    -- 2. Insert Prospect
    INSERT INTO public.warranty_prospects (
        company_id,
        seller_id,
        customer_name,
        phone,
        product_name,
        email,
        purchase_date,
        expiry_date,
        status,
        warranty_price_2yr,
        warranty_price_3yr,
        purchase_amount
    )
    VALUES (
        v_company_id,
        p_user_id,
        (p_prospect->>'customer_name')::text,
        (p_prospect->>'phone')::text,
        (p_prospect->>'product_name')::text,
        (p_prospect->>'email')::text,
        (p_prospect->>'purchase_date')::timestamptz,
        (p_prospect->>'expiry_date')::timestamptz,
        (p_prospect->>'status')::text,
        (p_prospect->>'warranty_price_2yr')::bigint, -- Safe cast if integer in JSON
        (p_prospect->>'warranty_price_3yr')::bigint,
        (p_prospect->>'purchase_amount')::bigint
    )
    RETURNING id INTO v_new_id;

    -- 3. Return Success
    RETURN jsonb_build_object('id', v_new_id, 'status', 'success');
END;
$$;

-- Grant access to anonymous users (since the client is unauthenticated on DB level)
GRANT EXECUTE ON FUNCTION create_prospect(text, jsonb) TO anon;
