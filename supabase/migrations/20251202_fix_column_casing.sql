-- Rename columns to match Edge Function camelCase keys
-- Postgres defaults to lowercase, so we need to quote them to make them case-sensitive
-- to match the JSON keys sent by the Edge Function.

ALTER TABLE public.products RENAME COLUMN shopifyproductid TO "shopifyProductId";
ALTER TABLE public.products RENAME COLUMN imageurl TO "imageUrl";
