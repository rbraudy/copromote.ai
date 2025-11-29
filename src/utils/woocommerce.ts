import { Product } from '../types';

export const fetchWooCommerceProducts = async (
    storeUrl: string,
    onBatch?: (products: Product[], page: number, totalSoFar: number) => Promise<void> | void
): Promise<Product[]> => {
    let url = storeUrl.trim();
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }

    const perPage = 100;
    let page = 1;
    let allProducts: Product[] = [];
    let hasMore = true;

    try {
        while (hasMore) {
            const targetUrl = `${url}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}`;
            console.log(`Fetching WooCommerce page ${page}...`);

            // Use proxy to avoid CORS
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`WooCommerce fetch failed: ${response.statusText}`);
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                if (page === 1) throw new Error('Invalid WooCommerce response');
                hasMore = false;
                break;
            }

            const batchProducts: Product[] = data.map((p: any) => ({
                id: p.id.toString(),
                userId: '',
                name: p.name,
                description: (p.description || '').replace(/<[^>]*>?/gm, ''),
                price: parseFloat(p.price || '0'),
                imageUrl: p.images?.[0]?.src || '',
                originalStoreUrl: p.permalink,
                category: p.categories?.[0]?.name || null,
                brand: null,
                sku: p.sku || null,
                platform: 'woocommerce' as const,
                createdAt: p.date_created,
                updatedAt: p.date_modified
            }));

            if (batchProducts.length > 0) {
                allProducts = [...allProducts, ...batchProducts];
                if (onBatch) {
                    await onBatch(batchProducts, page, allProducts.length);
                }
            }

            if (data.length < perPage) {
                hasMore = false;
            } else {
                page++;
            }
        }
        return allProducts;
    } catch (error: any) {
        console.error("WooCommerce Fetch Error:", error);
        throw error;
    }
};
