# New Demo Company Setup Guide

This guide explains how to quickly onboard a new company for a demo.

## Prerequisites
- Access to Supabase Dashboard (SQL Editor).
- A valid email address for the new admin (or use a `+alias` like `rbraudy+newclient@gmail.com`).

---

## Step 1: Create the Company & User (SQL)
Run this SQL block in the Supabase SQL Editor. Replace the values at the top.

```sql
DO $$
DECLARE
    -- INPUTS: CHANGE THESE
    v_company_name TEXT := 'Your New Client'; -- e.g. "Bob's Cameras"
    v_company_slug TEXT := 'bobs-cameras';    -- URL-friendly slug
    v_admin_email TEXT := 'bobs@demo.com';    -- The email you will use to log in
    v_admin_password TEXT := 'password123';   -- Temporary password

    -- Variables (Do not change)
    v_company_id UUID;
    v_user_id UUID;
BEGIN
    -- 1. Create Company
    INSERT INTO public.companies (name, slug, domain)
    VALUES (v_company_name, v_company_slug, v_company_slug || '.com')
    RETURNING id INTO v_company_id;

    -- 2. Create Auth User (Simulated)
    -- In a real scenario, they would sign up. For demo, we insert directly into auth.users is tricky.
    -- BETTER APPROACH: Sign up via the Frontend first, THEN run a script to link them.
    
    -- ALTERNATIVE: Use an existing user (YOURSELF) and switch companies.
    -- But for a clean demo, sign up a new user via the app: http://localhost:5173/signup
    -- THEN run this to link them:
    
    /*
    UPDATE public.user_profiles
    SET company_id = v_company_id, role = 'admin'
    WHERE email = v_admin_email;
    */

    -- 3. Seed Default Script (Optional - existing logic handles this)
    -- The system will auto-insert a default script upon first call.
    -- OR you can force one now:
    
    INSERT INTO public.call_templates (company_id, system_prompt, first_message, voice_id)
    VALUES (
        v_company_id,
        'You are a helpful assistant for ' || v_company_name || '...',
        'Hi, this is Claire calling from ' || v_company_name || '...',
        'jBzLvP03992lMFEkj2kJ'
    );

    RAISE NOTICE 'Company % created with ID: %', v_company_name, v_company_id;
END $$;
```

## Step 2: The Easy Way (Frontend)
1.  **Sign Up**: Go to `/signup` and create an account for the new client (e.g., `client@demo.com`).
2.  **Link to Company**:
    *   By default, they are assigned a generic/new company.
    *   Go to **Supabase > Table Editor > user_profiles**.
    *   Find the new user.
    *   Change `role` to `admin`.
    *   (Optional) Update `company_id` if you pre-created a specific company in Step 1.
3.  **Configure Script**:
    *   Log in as the new user.
    *   Go to **Dashboard > Campaigns**.
    *   Paste your custom script or edit the defaults.

## Step 3: Verify
1.  Upload a CSV of prospects (or manually insert one via SQL) assigned to this new `company_id`.
2.  Make a test call.
