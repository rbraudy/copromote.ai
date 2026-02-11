-- 1. DROP the insecure "Public can view warranty prospects" policy
-- This stops people from running "SELECT * FROM warranty_prospects" anonymously
DROP POLICY IF EXISTS "Public can view warranty prospects" ON public.warranty_prospects;

-- 2. CREATE a Semantic Search Function (The "Safety Deposit Box")
-- This function only returns a single row, and only if the ID matches.
CREATE OR REPLACE FUNCTION get_public_prospect(p_id uuid)
RETURNS TABLE (
    id uuid,
    warranty_price_2yr integer,
    warranty_price_3yr integer,
    offer_discount_triggered boolean,
    discount_price integer,
    discount_expiry timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to bypass RLS
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wp.id,
        wp.warranty_price_2yr,
        wp.warranty_price_3yr,
        wp.offer_discount_triggered,
        wp.discount_price,
        wp.discount_expiry
    FROM public.warranty_prospects wp
    WHERE wp.id = p_id;
END;
$$;

-- 3. GRANT Execute Permission to Anonymous Users
GRANT EXECUTE ON FUNCTION get_public_prospect(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_public_prospect(uuid) TO authenticated;
