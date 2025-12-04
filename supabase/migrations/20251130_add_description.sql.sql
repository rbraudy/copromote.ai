-- Add a description column (type TEXT) to store product descriptions
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS "description" TEXT;
