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
    onBatch?: (products: Product[], page: number, totalSoFar: number, totalCount?: number) => Promise<void> | void,
    onStatus?: (status: string) => void
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
    const limit = 50; // Reduced to 50 for better reliability and frequent updates
    let hasMorePages = true;
    let totalCount = 0;

    try {
        // Try to fetch total count first
        try {
            const countResponse = await fetch(`${url}/products/count.json`);
            if (countResponse.ok) {
                const countData = await countResponse.json();
                totalCount = countData.count || 0;
                console.log(`Total products to sync: ${totalCount}`);
            }
        } catch (e) {
            console.warn('Could not fetch product count, defaulting to unknown');
        }

        while (hasMorePages) {
            const productsUrl = `${baseProductsUrl}?limit=${limit}&page=${page}`;
            console.log(`Fetching Shopify page ${page}...`);
            if (onStatus) onStatus(`Syncing... (Fetching page ${page})`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            let retries = 3;
            let success = false;

            while (retries > 0 && !success) {
                try {
                    const response = await fetch(productsUrl, {
                        signal: controller.signal
                    });

                    if (!response.ok) {
                        throw new Error(`Shopify fetch failed: ${response.status} ${response.statusText}`);
                    }

                    const data: ShopifyResponse = await response.json();
                    clearTimeout(timeoutId);

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
                            if (onStatus) onStatus(`Syncing... (Saving ${batchProducts.length} products)`);
                            // Sequential await to ensure reliability
                            await onBatch(batchProducts, page, allProducts.length, totalCount);
                        }
                    }

                    if (data.products.length < limit) {
                        hasMorePages = false;
                    } else {
                        page++;
                    }

                    success = true;

                } catch (fetchError: any) {
                    retries--;
                    console.warn(`Error fetching Shopify page ${page}, retries left: ${retries}`, fetchError);
                    if (retries === 0) {
                        clearTimeout(timeoutId);
                        console.error(`Failed to fetch Shopify page ${page} after retries.`);
                        throw new Error(`Failed to fetch page ${page} after 3 attempts. Please check your connection.`);
                    } else {
                        // Wait before retry
                        if (onStatus) onStatus(`Syncing... (Retrying page ${page}, attempt ${4 - retries})`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
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
