-- Add enrichment columns to external_products table
ALTER TABLE public.external_products ADD COLUMN IF NOT EXISTS object_name TEXT;
ALTER TABLE public.external_products ADD COLUMN IF NOT EXISTS core_product_use TEXT;
