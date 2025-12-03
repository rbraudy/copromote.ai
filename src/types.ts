export interface User {
    uid: string;
    email?: string | null;
    displayName?: string | null;
}

export interface Product {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    platform?: string;
    createdAt?: string;
    updatedAt?: string;
    shopifyProductId?: string;
    // Additional fields from Shopify/WooCommerce can be added as needed
    [key: string]: any;
}
