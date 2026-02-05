-- Add imageUrl column to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
