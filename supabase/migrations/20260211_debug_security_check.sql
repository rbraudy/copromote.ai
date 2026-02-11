-- RUN THIS IN SUPABASE SQL EDITOR TO DIAGNOSE PERMISSIONS

-- 1. Check Companies
SELECT * FROM companies;

-- 2. Check User Profiles (This controls who sees what)
SELECT * FROM user_profiles;

-- 3. Check Prospect Distribution
SELECT company_id, count(*) as prospect_count 
FROM warranty_prospects 
GROUP BY company_id;
