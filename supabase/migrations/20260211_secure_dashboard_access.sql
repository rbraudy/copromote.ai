-- 1. Ensure the "Open Door" policy is definitely dropped
DROP POLICY IF EXISTS "Public can view warranty prospects" ON public.warranty_prospects;
DROP POLICY IF EXISTS "Public can view warranty prospects by ID" ON public.warranty_prospects;

-- 2. Create the Dashboard Access Function
-- This mimics RLS but works for our "Anon Client + Firebase ID" architecture.
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
    -- We need to join call_logs manually since we can't efficiently return nested JSON in simple table returns without complexity
    -- For now, let's return the simplified prospect data. The Dashboard might need to fetch logs separately or we include a summary.
    -- Wait, the dashboard needs join logic. Let's start with basic prospect data.
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
    -- 1. Look up the company for this user
    SELECT company_id INTO v_company_id
    FROM public.user_profiles
    WHERE user_id = p_user_id;

    -- 2. Return prospects for that company
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
        -- Simple aggregation for latest outcome (Optimization)
        (SELECT outcome FROM call_logs cl WHERE cl.prospect_id = wp.id ORDER BY cl.created_at DESC LIMIT 1) as latest_outcome,
        (SELECT count(*) FROM call_logs cl WHERE cl.prospect_id = wp.id) as call_attempts
    FROM public.warranty_prospects wp
    WHERE wp.company_id = v_company_id
    ORDER BY wp.created_at DESC;

END;
$$;

-- 3. Grant Access
GRANT EXECUTE ON FUNCTION get_company_prospects(text) TO anon;
GRANT EXECUTE ON FUNCTION get_company_prospects(text) TO authenticated;
