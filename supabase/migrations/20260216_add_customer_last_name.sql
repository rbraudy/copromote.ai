-- Add customer_last_name column to warranty_prospects
ALTER TABLE public.warranty_prospects ADD COLUMN IF NOT EXISTS customer_last_name TEXT;

-- Populate customer_last_name from customer_name for existing records
UPDATE public.warranty_prospects
SET customer_last_name = (
    CASE 
        WHEN position(' ' in trim(customer_name)) > 0 
        THEN reverse(split_part(reverse(trim(customer_name)), ' ', 1))
        ELSE ''
    END
)
WHERE customer_last_name IS NULL OR customer_last_name = '';
