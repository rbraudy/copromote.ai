export interface Product {
    id?: string;
    userId: string;
    user_id?: string; // snake_case column name for Supabase
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    originalStoreUrl?: string;
    category?: string | null;
    brand?: string | null;
    sku?: string | null;
    shopifyProductId?: string | null;
    platform?: 'shopify' | 'woocommerce' | 'manual';
    createdAt?: string;
    updatedAt?: string;
}

export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}
