-- Drop policies if they exist to avoid conflicts (Idempotent)
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.user_profiles;

-- Re-create policies (ensuring they exist)
CREATE POLICY "Users can create companies" ON public.companies
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can create their own profile" ON public.user_profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (user_id = auth.uid()::text);

-- Create the Secure RPC function to handle the "Catch-22" of Multi-tenancy
-- This function runs as the Database Owner (SECURITY DEFINER), bypassing RLS checks.
CREATE OR REPLACE FUNCTION create_company_and_profile(name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    new_company_id uuid;
BEGIN
    -- 1. Create Company
    INSERT INTO companies (name)
    VALUES (name)
    RETURNING id INTO new_company_id;

    -- 2. Create Profile for the user, linking them to the new company
    INSERT INTO user_profiles (user_id, company_id, role)
    VALUES (auth.uid()::text, new_company_id, 'admin');

    RETURN new_company_id;
END;
$$;
