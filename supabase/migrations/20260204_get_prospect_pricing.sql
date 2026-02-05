CREATE OR REPLACE FUNCTION get_prospect_pricing(session_id uuid)
RETURNS TABLE (
  warranty_price_2yr integer,
  warranty_price_3yr integer,
  purchase_amount integer
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
    wp.purchase_amount
  FROM warranty_prospects wp
  WHERE wp.id = session_id;
END;
$$;
