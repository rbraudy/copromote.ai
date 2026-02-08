-- 1. Ensure purchase_amount column exists (This was missing and causing import errors)
ALTER TABLE "public"."warranty_prospects" 
ADD COLUMN IF NOT EXISTS "purchase_amount" integer DEFAULT 0;

-- 2. Create the Pricing RPC (Required for the pricing page to work)
DROP FUNCTION IF EXISTS get_prospect_pricing(uuid);

CREATE OR REPLACE FUNCTION get_prospect_pricing(session_id uuid)
RETURNS TABLE (
  warranty_price_2yr integer,
  warranty_price_3yr integer,
  purchase_amount integer,
  current_price integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wp.warranty_price_2yr,
    wp.warranty_price_3yr,
    wp.purchase_amount,
    ws.current_price
  FROM warranty_prospects wp
  LEFT JOIN warranty_sessions ws ON ws.id = wp.id
  WHERE wp.id = session_id;
END;
$$;
