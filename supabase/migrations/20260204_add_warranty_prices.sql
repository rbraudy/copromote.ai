-- Add warranty pricing columns to warranty_prospects
ALTER TABLE "public"."warranty_prospects" 
ADD COLUMN IF NOT EXISTS "warranty_price_2yr" integer DEFAULT 199,
ADD COLUMN IF NOT EXISTS "warranty_price_3yr" integer DEFAULT 299;
