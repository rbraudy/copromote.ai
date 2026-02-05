-- Fix UUID type mismatch for Firebase UIDs
-- The user_id column was created as UUID, but Firebase UIDs are strings (e.g., "j8Naar6kIsc1AXU2kvOvcOE7Lzw1").
-- This migration changes the column type to TEXT to allow storing Firebase UIDs.

ALTER TABLE public.products ALTER COLUMN user_id TYPE TEXT;

-- Note: If you have RLS policies relying on auth.uid() (which is UUID), they might need adjustment 
-- if you are not using Supabase Auth. For now, this fixes the immediate "invalid input syntax" error.
