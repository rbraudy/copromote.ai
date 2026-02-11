-- 1. DROP ALL INSECURE POLICIES
DROP POLICY IF EXISTS "Public can view warranty prospects" ON public.warranty_prospects;
DROP POLICY IF EXISTS "Public can view warranty prospects by ID" ON public.warranty_prospects;
DROP POLICY IF EXISTS "Users can view/edit company prospects" ON public.warranty_prospects;

-- 2. CREATE FUNCTION
CREATE OR REPLACE FUNCTION get_company_prospects(p_user_id text)
RETURNS TABLE (
    id uuid,
    customer_name text,
    phone text,
    product_name text,
    purchase_date timestamptz,
    expiry_date timestamptz,
    status text,
    created_at timestamptz,
    company_id uuid,
    latest_outcome text,
    call_attempts bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id uuid;
BEGIN
    SELECT company_id INTO v_company_id
    FROM public.user_profiles
    WHERE user_id = p_user_id;

    RETURN QUERY
    SELECT 
        wp.id,
        wp.customer_name,
        wp.phone,
        wp.product_name,
        wp.purchase_date,
        wp.expiry_date,
        wp.status,
        wp.created_at,
        wp.company_id,
        (SELECT outcome FROM call_logs cl WHERE cl.prospect_id = wp.id ORDER BY cl.created_at DESC LIMIT 1) as latest_outcome,
        (SELECT count(*) FROM call_logs cl WHERE cl.prospect_id = wp.id) as call_attempts
    FROM public.warranty_prospects wp
    WHERE wp.company_id = v_company_id
    ORDER BY wp.created_at DESC;
END;
$$;

-- 3. PERMISSIONS
GRANT EXECUTE ON FUNCTION get_company_prospects(text) TO anon;
GRANT EXECUTE ON FUNCTION get_company_prospects(text) TO authenticated;
ALTER TABLE public.warranty_prospects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: Public policies removed. Security is active.';
END $$;
