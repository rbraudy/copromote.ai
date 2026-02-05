
-- EMERGENCY REVERT: Disable RLS to ensure demo works
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE copromotions DISABLE ROW LEVEL SECURITY;

-- Drop the policies just in case
DROP POLICY IF EXISTS "Public can view leads" ON leads;
DROP POLICY IF EXISTS "Public can view sent proposals" ON copromotions;
DROP POLICY IF EXISTS "Public can update proposal status" ON copromotions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON copromotions;
