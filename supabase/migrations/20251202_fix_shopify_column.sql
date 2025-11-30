-- Rename shopifyProductId to camelCase
-- We skip imageUrl because it seems to already exist correctly.

ALTER TABLE public.products RENAME COLUMN shopifyproductid TO "shopifyProductId";
