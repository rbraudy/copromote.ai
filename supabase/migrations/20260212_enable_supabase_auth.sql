-- 1. Create a Trigger to auto-create user_profiles on Signup
-- This listens to Supabase Auth (auth.users) and writes to public.user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_company_id UUID;
BEGIN
    -- 1. Create a new Company for the user (One to One for now, or use metadata)
    INSERT INTO public.companies (name)
    VALUES (new.raw_user_meta_data->>'business_name')
    RETURNING id INTO new_company_id;

    -- 2. Create the User Profile linked to that Company
    INSERT INTO public.user_profiles (user_id, company_id, role, full_name)
    VALUES (
        new.id::text, 
        new_company_id, 
        'admin', -- First user is always admin
        new.raw_user_meta_data->>'full_name'
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- 3. Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own company
CREATE POLICY "Users can view own company"
    ON public.companies
    FOR SELECT
    USING (
        id IN (
            SELECT company_id 
            FROM public.user_profiles 
            WHERE user_id = auth.uid()::text
        )
    );

-- 4. Enable RLS on warranty_prospects (The Core Data)
ALTER TABLE public.warranty_prospects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view prospects belonging to their company
-- Note: Replaces the "Safety Deposit Box" RPC approach
CREATE POLICY "Users can view company prospects"
    ON public.warranty_prospects
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.user_profiles 
            WHERE user_id = auth.uid()::text
        )
    );

-- 5. Cleanup: Drop the old "Safety Deposit Box" RPCs
-- We don't need these anymore because standard SELECT/INSERT works now!
DROP FUNCTION IF EXISTS get_company_prospects(text);
DROP FUNCTION IF EXISTS create_prospect(text, text, text, text, text, text, text);
