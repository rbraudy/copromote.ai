-- Add enrichment columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS object_name TEXT,
ADD COLUMN IF NOT EXISTS core_product_use TEXT;

-- Add enrichment columns to external_products table as well (for the partner side)
ALTER TABLE public.external_products
ADD COLUMN IF NOT EXISTS object_name TEXT,
ADD COLUMN IF NOT EXISTS core_product_use TEXT;
