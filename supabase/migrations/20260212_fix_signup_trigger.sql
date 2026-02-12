-- Fix: Add missing 'full_name' column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Verify RLS policy for companies
-- Ensure the key is unique if needed, but for now just fix the missing column.
DO $$
BEGIN
    RAISE NOTICE 'Added full_name column to user_profiles';
END $$;
