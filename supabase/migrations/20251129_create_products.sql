-- Supabase migration to create the `products` table used by the app
-- Run this SQL in the Supabase dashboard (SQL editor) or via the CLI.

DROP TABLE IF EXISTS public.products;

CREATE TABLE public.products (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    price             NUMERIC NOT NULL,
    imageUrl          TEXT,
    platform          TEXT,
    createdAt         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updatedAt         TIMESTAMPTZ NOT NULL DEFAULT now(),
    userId            UUID NOT NULL,
    shopifyProductId TEXT,
    extra_data        JSONB
);

-- Enable row level security (optional, adjust policies as needed)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy allowing each user to CRUD their own products
CREATE POLICY "Allow user CRUD own products" ON public.products
    FOR ALL USING (auth.uid() = userId)
    WITH CHECK (auth.uid() = userId);
