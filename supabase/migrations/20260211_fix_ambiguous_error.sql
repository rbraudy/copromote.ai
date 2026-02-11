-- 1. Fix "Ambiguous Column" in RPC Function
DROP FUNCTION IF EXISTS public.get_company_prospects(text);

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
    res_company_id uuid, -- Renamed output column to avoid conflict with variable/table col
    latest_outcome text,
    call_attempts bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    var_comp_id uuid; -- Renamed variable to be unique
BEGIN
    -- Look up company - Explicit alias
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
        wp.company_id AS res_company_id, -- Maps to renamed output
        (SELECT outcome FROM call_logs cl WHERE cl.prospect_id = wp.id ORDER BY cl.created_at DESC LIMIT 1) as latest_outcome,
        (SELECT count(*) FROM call_logs cl WHERE cl.prospect_id = wp.id) as call_attempts
    FROM public.warranty_prospects wp
    WHERE wp.company_id = var_comp_id
    ORDER BY wp.created_at DESC;
END;
$$;

-- 2. Debug Trigger Failure (Import)
CREATE OR REPLACE FUNCTION public.set_warranty_company_id()
RETURNS TRIGGER AS $$
DECLARE
    var_comp_id uuid;
    var_user_id text;
BEGIN
    var_user_id := auth.uid()::text;

    -- Get the company_id for the current user
    SELECT up.company_id INTO var_comp_id
    FROM public.user_profiles up
    WHERE up.user_id = var_user_id;

    -- If user has no company, ERROR WITH THE ID so we can debug
    IF var_comp_id IS NULL THEN
        RAISE EXCEPTION 'User % does not belong to a company.', var_user_id;
    END IF;

    -- Override the company_id with the user's company
    NEW.company_id := var_comp_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach Trigger (just to be safe)
DROP TRIGGER IF EXISTS trig_set_company_id ON public.warranty_prospects;
CREATE TRIGGER trig_set_company_id
BEFORE INSERT ON public.warranty_prospects
FOR EACH ROW
EXECUTE FUNCTION public.set_warranty_company_id();
