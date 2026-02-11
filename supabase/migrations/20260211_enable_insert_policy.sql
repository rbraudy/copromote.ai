-- 1. Create Trigger Function to Auto-Assign Company ID
CREATE OR REPLACE FUNCTION public.set_warranty_company_id()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id uuid;
BEGIN
    -- Get the company_id for the current user
    SELECT company_id INTO v_company_id
    FROM public.user_profiles
    WHERE user_id = auth.uid()::text;

    -- If user has no company, they cannot insert (Constraint violation)
    -- Or we can let it fail RLS. But let's be explicit.
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'User does not belong to a company.';
    END IF;

    -- Override the company_id with the user's company
    NEW.company_id := v_company_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS trig_set_company_id ON public.warranty_prospects;
CREATE TRIGGER trig_set_company_id
BEFORE INSERT ON public.warranty_prospects
FOR EACH ROW
EXECUTE FUNCTION public.set_warranty_company_id();

-- 3. Create RLS Policy for INSERT
DROP POLICY IF EXISTS "Users can insert their own company prospects" ON public.warranty_prospects;

CREATE POLICY "Users can insert their own company prospects" ON public.warranty_prospects
FOR INSERT 
TO authenticated
WITH CHECK (
    -- The Trigger runs BEFORE this check, so NEW.company_id will be populated.
    company_id IN (
        SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text
    )
);

-- 4. Just in case, allow UPDATE too? No, usually imports just insert.
-- We can add UPDATE later if needed.
