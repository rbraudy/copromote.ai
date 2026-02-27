-- Migration: Fix tenant_config RLS Policy for Admins
-- Date: 2026-02-24

-- This migration allows regular Company Admins to use .upsert() on the tenant_config table,
-- while respecting the existing role hierarchy.

-- 1. Enhance tenant_config RLS Policies
-- We need to allow company admins to INSERT so that .upsert() works correctly.

DROP POLICY IF EXISTS "Admins can update tenant config" ON public.tenant_config;
DROP POLICY IF EXISTS "Superadmins can insert tenant config" ON public.tenant_config;
DROP POLICY IF EXISTS "Admins and Superadmins can insert tenant config" ON public.tenant_config;
DROP POLICY IF EXISTS "Admins and Superadmins can update tenant config" ON public.tenant_config;
DROP POLICY IF EXISTS "Superadmins have full access to tenant config" ON public.tenant_config;

-- A. INSERT POLICY
-- Allows an Admin to create their initial company branding row.
CREATE POLICY "Admins can insert tenant config" 
    ON public.tenant_config 
    FOR INSERT 
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid()::text AND role = 'admin'
        )
    );

-- B. UPDATE POLICY
-- Allows an Admin to update their company's branding row.
CREATE POLICY "Admins can update tenant config" 
    ON public.tenant_config 
    FOR UPDATE 
    USING (
        company_id = public.get_my_company_id()
        AND 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid()::text AND role = 'admin'
        )
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND 
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid()::text AND role = 'admin'
        )
    );

-- C. ALL POLICY (Safety net for Superadmins)
CREATE POLICY "Superadmins have full access to tenant config"
    ON public.tenant_config
    FOR ALL
    USING (public.is_superadmin());

-- D. Ensure Public Read stays intact
DROP POLICY IF EXISTS "Public can view tenant config" ON public.tenant_config;
CREATE POLICY "Public can view tenant config" 
    ON public.tenant_config 
    FOR SELECT 
    USING (true);
