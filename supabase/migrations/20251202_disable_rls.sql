-- Disable RLS on products table
-- Since we are using Firebase Auth, Supabase considers all requests as "anon".
-- RLS blocks "anon" from reading by default.
-- We disable it to allow the client to fetch products (filtered by user_id in the query).

ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
