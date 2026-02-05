-- Fix: Drop policy before changing column type, then recreate it
-- 1. Drop the policy that depends on user_id
DROP POLICY IF EXISTS "Users can only access their own products" ON public.products;
DROP POLICY IF EXISTS "Allow user CRUD own products" ON public.products; -- Drop this one too just in case

-- 2. Now we can safely change the type to TEXT
ALTER TABLE public.products ALTER COLUMN user_id TYPE TEXT;

-- 3. Recreate the policy
-- Note: auth.uid() returns a UUID, so we cast it to text to match the new column type
CREATE POLICY "Users can only access their own products"
ON public.products
FOR ALL
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);
