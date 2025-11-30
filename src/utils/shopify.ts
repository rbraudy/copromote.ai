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

    // Try the 'all' collection endpoint first, then fallback to root products.json
    const endpoints = [
        `${url}/collections/all/products.json`,
        `${url}/products.json`
    ];

    let allProducts: Product[] = [];
    let page = 1;
    const limit = 10; // Reduced to 10 to prevent Firestore write timeouts
    let hasMorePages = true;
    let totalCount = 0;

    // Helper to fetch with CORS proxy fallback
    const fetchWithFallback = async (targetUrl: string, options?: RequestInit) => {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // Skip direct fetch on localhost to avoid CORS errors and save time
        if (!isLocalhost) {
            try {
                const res = await fetch(targetUrl, options);
                if (res.ok) return res;
            } catch (err) {
                console.warn(`Direct fetch failed for ${targetUrl}, switching to proxy.`);
            }
        } else {
            console.log('Localhost detected, skipping direct fetch to avoid CORS errors.');
        }

        // Proxy Strategy 1: corsproxy.io (Primary)
        try {
            console.log(`Attempting proxy: corsproxy.io for ${targetUrl}`);
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
            const res = await fetch(proxyUrl, options);
            if (res.ok) return res;
            console.warn(`CorsProxy returned status ${res.status}`);
        } catch (err) {
            console.warn(`CorsProxy failed, trying backup...`, err);
        }

        // Proxy Strategy 2: allorigins (Backup)
        try {
            console.log(`Attempting proxy: allorigins for ${targetUrl}`);
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
            const res = await fetch(proxyUrl, options);
            if (res.ok) return res;
            throw new Error(`Status ${res.status}`);
        } catch (err) {
            console.error(`All fetch strategies failed for ${targetUrl}`);
            throw err;
        }
    };

    let activeEndpoint = endpoints[0];

    try {
        // Check if the first endpoint works (using proxy fallback)
        try {
            const checkUrl = `${activeEndpoint}?limit=1`;
            const checkResponse = await fetchWithFallback(checkUrl, { method: 'HEAD' });
            if (!checkResponse.ok) {
                console.warn(`Endpoint ${activeEndpoint} returned ${checkResponse.status}, trying fallback...`);
                activeEndpoint = endpoints[1];
            }
        } catch (e) {
            console.warn(`Error checking endpoint ${activeEndpoint}, trying fallback...`, e);
            activeEndpoint = endpoints[1];
        }

        console.log(`Using Shopify endpoint: ${activeEndpoint}`);

        while (hasMorePages) {
            const productsUrl = `${activeEndpoint}?limit=${limit}&page=${page}`;
            console.log(`Fetching Shopify page ${page}...`);
            if (onStatus) onStatus(`Syncing... (Fetching page ${page})`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            let retries = 3;
            let success = false;

            while (retries > 0 && !success) {
                try {
                    const response = await fetchWithFallback(productsUrl, {
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
                        const price = firstVariant?.price ? parseFloat(firstVariant.price) : 0;

                        return {
                            id: p.id.toString(), // Keep original ID for reference
                            user_id: '', // Will be filled by the caller
                            name: p.title || 'Unnamed Product',
                            description: (p.body_html || '').replace(/<[^>]*>?/gm, '').slice(0, 150) + '...',
                            price: isNaN(price) ? 0 : price, // Ensure no NaN values
                            imageUrl: p.images?.[0]?.src || firstVariant?.image_src || 'https://placehold.co/300x300?text=No+Image',
                            originalStoreUrl: `${url}/products/${p.handle}`,
                            category: p.product_type || null,
                            brand: p.vendor || null,
                            sku: firstVariant?.sku || null,
                            shopifyProductId: p.id ? String(p.id) : undefined,
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
