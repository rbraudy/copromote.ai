-- Robust migration to fix schema issues
-- 1. Add imageUrl if missing
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- 2. Rename userid (lowercase) to user_id (snake_case)
-- We use a DO block to check if 'userid' exists before renaming to avoid errors if it's already renamed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'userid') THEN
        ALTER TABLE public.products RENAME COLUMN userid TO user_id;
    END IF;
END $$;

-- 3. Ensure user_id is NOT NULL
ALTER TABLE public.products ALTER COLUMN user_id SET NOT NULL;

-- 4. Recreate Index
DROP INDEX IF EXISTS idx_products_userId; -- Drop old index if exists
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products (user_id);

-- 5. Update RLS Policies
-- Drop potential old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can only access their own products" ON public.products;
DROP POLICY IF EXISTS "Allow user CRUD own products" ON public.products;

-- Create the correct policy using user_id
CREATE POLICY "Users can only access their own products"
ON public.products
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
