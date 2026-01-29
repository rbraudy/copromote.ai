-- Fix RLS policies to allow creation of companies and profiles

-- Allow authenticated users to create a company
CREATE POLICY "Users can create companies" ON public.companies
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to create their own profile
CREATE POLICY "Users can create their own profile" ON public.user_profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (user_id = auth.uid()::text);
