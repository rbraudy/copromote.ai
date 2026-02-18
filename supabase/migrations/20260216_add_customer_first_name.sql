-- Add customer_first_name column to warranty_prospects
ALTER TABLE public.warranty_prospects ADD COLUMN IF NOT EXISTS customer_first_name TEXT;

-- Populate customer_first_name from customer_name for existing records
UPDATE public.warranty_prospects
SET customer_first_name = split_part(customer_name, ' ', 1)
WHERE customer_first_name IS NULL OR customer_first_name = '';

-- Optional: Ensure RLS policies don't need updates (they usually apply to the whole row)
-- But let's verify if we need to explicitly allow this column in SELECT/INSERT
-- Since existing policies use FOR ALL/FOR SELECT on the table, it should be fine.
