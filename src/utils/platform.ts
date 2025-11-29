export const detectPlatform = async (url: string): Promise<'shopify' | 'woocommerce' | 'unknown'> => {
    try {
        // Normalize URL
        let targetUrl = url.trim();
        if (!targetUrl.startsWith('http')) {
            targetUrl = `https://${targetUrl}`;
        }
        if (targetUrl.endsWith('/')) {
            targetUrl = targetUrl.slice(0, -1);
        }

        // Check for Shopify
        try {
            const shopifyResponse = await fetch(`${targetUrl}/products.json?limit=1`);
            if (shopifyResponse.ok) {
                return 'shopify';
            }
        } catch (e) {
            // Ignore error and try next
        }

        // Check for WooCommerce
        try {
            const wooResponse = await fetch(`${targetUrl}/wp-json/wc/v3/products`);
            if (wooResponse.ok || wooResponse.status === 401) { // 401 means it exists but needs auth
                return 'woocommerce';
            }
        } catch (e) {
            // Ignore
        }

        return 'unknown';
    } catch (error) {
        console.error("Error detecting platform:", error);
        return 'unknown';
    }
};
