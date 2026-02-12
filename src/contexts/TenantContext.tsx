import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Define the shape of our Tenant Config
export interface TenantConfig {
    company_id: string;
    domain: string;
    brand_name: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    support_email: string | null;
}

// Default "Platform" Branding (CoPromote)
const DEFAULT_TENANT: TenantConfig = {
    company_id: 'platform',
    domain: 'copromote',
    brand_name: 'CoPromote',
    logo_url: null, // Use default SVG in Header
    primary_color: '#3b82f6', // Blue
    secondary_color: '#1e293b', // Slate
    support_email: 'support@copromote.ai'
};

interface TenantContextType {
    tenant: TenantConfig;
    loading: boolean;
    error: string | null;
}

const TenantContext = createContext<TenantContextType>({
    tenant: DEFAULT_TENANT,
    loading: true,
    error: null
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tenant, setTenant] = useState<TenantConfig>(DEFAULT_TENANT);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTenantConfig = async () => {
            try {
                // 1. Determine Tenant Identifier
                // Priority: Query Param (?tenant=henrys) > Subdomain (henrys.copromote.ai)
                const urlParams = new URLSearchParams(window.location.search);
                const queryTenant = urlParams.get('tenant');

                const hostname = window.location.hostname;
                // Assuming format: tenant.domain.com
                // localhost handling: sub.localhost -> sub
                const parts = hostname.split('.');
                let subdomain = null;

                if (hostname.includes('localhost')) {
                    if (parts.length > 1 && parts[0] !== 'www') subdomain = parts[0];
                } else {
                    if (parts.length > 2) subdomain = parts[0];
                }

                // If no tenant specified, use default
                const tenantIdentifier = queryTenant || subdomain;

                if (!tenantIdentifier || tenantIdentifier === 'www' || tenantIdentifier === 'app') {
                    setTenant(DEFAULT_TENANT);
                    setLoading(false);
                    return;
                }

                console.log(`Loading config for tenant: ${tenantIdentifier}`);

                // 2. Fetch from Supabase
                const { data, error } = await supabase
                    .from('tenant_config')
                    .select('*')
                    .eq('domain', tenantIdentifier)
                    .single();

                if (error) {
                    console.warn(`Tenant not found (${tenantIdentifier}), using default.`);
                    // Don't error out, just use default/platform branding
                    setTenant(DEFAULT_TENANT);
                } else if (data) {
                    setTenant(data as TenantConfig);
                    // Dynamically set CSS variables or document title here if desired
                    document.title = data.brand_name;
                }

            } catch (err: any) {
                console.error("Error loading tenant config:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTenantConfig();
    }, []);

    // Effect to apply CSS variables for colors
    useEffect(() => {
        if (tenant) {
            document.documentElement.style.setProperty('--tenant-primary', tenant.primary_color);
            document.documentElement.style.setProperty('--tenant-secondary', tenant.secondary_color);
        }
    }, [tenant]);

    return (
        <TenantContext.Provider value={{ tenant, loading, error }}>
            {children}
        </TenantContext.Provider>
    );
};
