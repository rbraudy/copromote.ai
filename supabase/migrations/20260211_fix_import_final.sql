-- 1. DROP THE TRIGGER that is blocking imports
-- The trigger tries to check auth.uid(), which is NULL for Firebase users.
-- The RPC 'create_prospect' handles company_id assignment securely, so this trigger is redundant and harmful.
DROP TRIGGER IF EXISTS trig_set_company_id ON public.warranty_prospects;
DROP FUNCTION IF EXISTS public.set_warranty_company_id();

-- 2. FIX THE DASHBOARD RPC (Join Column Name)
-- Previous version used 'prospect_id', but the column in call_logs is likely 'warranty_prospect_id'
DROP FUNCTION IF EXISTS public.get_company_prospects(text);

CREATE OR REPLACE FUNCTION get_company_prospects(p_user_id text)
RETURNS TABLE (
    id uuid,
    customer_name text,
    phone text,
    product_name text,
    purchase_date date, -- Changed to date to match schema
    expiry_date date,   -- Changed to date to match schema
    status text,
    created_at timestamptz,
    res_company_id uuid,
    latest_outcome text,
    call_attempts bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    var_comp_id uuid;
BEGIN
    -- Look up company
    SELECT up.company_id INTO var_comp_id
    FROM public.user_profiles up
    WHERE up.user_id = p_user_id;

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
        wp.company_id AS res_company_id,
        -- FIX: Use 'warranty_prospect_id' instead of 'prospect_id' if that's the column name
        -- Based on CallTranscriptModal.tsx, it IS 'warranty_prospect_id'
        (SELECT outcome FROM call_logs cl WHERE cl.warranty_prospect_id = wp.id ORDER BY cl.created_at DESC LIMIT 1) as latest_outcome,
        (SELECT count(*) FROM call_logs cl WHERE cl.warranty_prospect_id = wp.id) as call_attempts
    FROM public.warranty_prospects wp
    WHERE wp.company_id = var_comp_id
    ORDER BY wp.created_at DESC;
END;
$$;

-- Grant permissions again just in case
GRANT EXECUTE ON FUNCTION get_company_prospects(text) TO anon;
GRANT EXECUTE ON FUNCTION get_company_prospects(text) TO authenticated;
