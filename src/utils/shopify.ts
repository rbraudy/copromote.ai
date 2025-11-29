import { Product } from '../types';

interface ShopifyProduct {
    id: number;
    title: string;
    body_html: string;
    vendor: string;
    product_type: string;
    handle: string;
    images: { src: string }[];
    variants: {
        price: string;
        sku: string;
        image_src?: string;
    }[];
    created_at: string;
    updated_at: string;
}

interface ShopifyResponse {
    products: ShopifyProduct[];
}

export const fetchShopifyProducts = async (
    storeUrl: string,
    onBatch?: (products: Product[], page: number, totalSoFar: number) => Promise<void> | void
): Promise<Product[]> => {

    // Normalize URL
    let url = storeUrl.trim();
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }

    // Use the 'all' collection endpoint which often bypasses the 250 limit on the root products.json
    const baseProductsUrl = `${url}/collections/all/products.json`;
    let allProducts: Product[] = [];
    let page = 1;
    const limit = 250; // Use larger batch for speed
    let hasMorePages = true;

    try {
        while (hasMorePages) {
            const productsUrl = `${baseProductsUrl}?limit=${limit}&page=${page}`;
            console.log(`Fetching Shopify page ${page}...`);

            // Add delay to avoid rate limiting
            if (page > 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            try {
                const response = await fetch(productsUrl, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`Shopify fetch failed: ${response.status} ${response.statusText}`);
                }

                const data: ShopifyResponse = await response.json();

                if (!data.products || !Array.isArray(data.products)) {
                    if (page === 1) throw new Error('Invalid Shopify response format');
                    hasMorePages = false;
                    break;
                }

                console.log(`Shopify page ${page}: ${data.products.length} products`);

                const batchProducts: Product[] = data.products.map((p) => {
                    const firstVariant = p.variants?.[0];
                    return {
                        id: p.id.toString(), // Keep original ID for reference
                        userId: '', // Will be filled by the caller
                        name: p.title || 'Unnamed Product',
                        description: (p.body_html || '').replace(/<[^>]*>?/gm, '').slice(0, 150) + '...',
                        price: firstVariant?.price ? parseFloat(firstVariant.price) : 0,
                        imageUrl: p.images?.[0]?.src || firstVariant?.image_src || 'https://placehold.co/300x300?text=No+Image',
                        originalStoreUrl: `${url}/products/${p.handle}`,
                        category: p.product_type || null,
                        brand: p.vendor || null,
                        sku: firstVariant?.sku || null,
                        shopifyProductId: p.id ? String(p.id) : null,
                        platform: 'shopify' as const,
                        createdAt: p.created_at,
                        updatedAt: p.updated_at
                    };
                });

                if (batchProducts.length > 0) {
                    allProducts = [...allProducts, ...batchProducts];
                    if (onBatch) {
                        await onBatch(batchProducts, page, allProducts.length);
                    }
                }

                if (data.products.length < limit) {
                    hasMorePages = false;
                } else {
                    page++;
                }

            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                console.error(`Error fetching Shopify page ${page}:`, fetchError);
                // If a page fails, we stop but return what we have so far
                hasMorePages = false;
                if (allProducts.length === 0) throw fetchError;
            }
        }

        return allProducts;
    } catch (error: any) {
        console.error("Shopify Fetch Error:", error);
        throw new Error(
            `Could not fetch products. ${error.message}`
        );
    }
};
