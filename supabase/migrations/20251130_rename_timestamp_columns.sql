-- Rename lower‑case timestamp columns to quoted camelCase names for Supabase compatibility
ALTER TABLE public.products
  RENAME COLUMN createdat TO "createdAt",
  RENAME COLUMN updatedat TO "updatedAt";
