import React, { createContext, useContext, useEffect, useState } from 'react';

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
    const error: string | null = null;

    useEffect(() => {
        // We no longer fetch from the database since CoPromote is a single-tenant application
        setTenant(DEFAULT_TENANT);
        setLoading(false);
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
