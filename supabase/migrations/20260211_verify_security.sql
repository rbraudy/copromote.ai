-- RUN THIS SCRIPT ONE STATEMENT AT A TIME
-- 1. Check Active Policies (Is the 'Public' policy still there?)
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'warranty_prospects';

-- 2. Check User Profiles (Who is linked to what company?)
SELECT * FROM user_profiles;

-- 3. Check Who Has Data (Are prospects correctly assigned?)
SELECT company_id, count(*) as prospect_count 
FROM warranty_prospects 
GROUP BY company_id;
