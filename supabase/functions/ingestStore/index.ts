import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Parse Request
        const { storeUrl, leadId } = await req.json()

        if (!storeUrl) throw new Error('storeUrl is required')
        if (!leadId) throw new Error('leadId is required')

        console.log(`Ingesting ${storeUrl} for lead ${leadId}...`)

        // 2. Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? ''
        )

        // 3. Clear existing products for this lead (Full Sync)
        const { error: deleteError } = await supabaseAdmin
            .from('external_products')
            .delete()
            .eq('lead_id', leadId)

        if (deleteError) throw deleteError

        // 4. Fetch Products from Shopify (Paginated)
        let page = 1
        let totalIngested = 0
        const limit = 250 // Max allowed by Shopify
        let hasMore = true

        // Clean store URL (remove trailing slash)
        const baseUrl = storeUrl.replace(/\/$/, '')

        while (hasMore) {
            console.log(`Fetching page ${page}...`)
            const response = await fetch(`${baseUrl}/products.json?limit=${limit}&page=${page}`)

            if (!response.ok) {
                console.error(`Failed to fetch page ${page}: ${response.status} ${response.statusText}`)
                break
            }

            const data = await response.json()
            const products = data.products

            if (!products || products.length === 0) {
                hasMore = false
                break
            }

            // 5. Map to Schema
            const mappedProducts = products.map((p: any) => {
                const variant = p.variants && p.variants.length > 0 ? p.variants[0] : {}
                const image = p.images && p.images.length > 0 ? p.images[0] : {}

                return {
                    lead_id: leadId,
                    title: p.title,
                    image_url: image.src || null,
                    price: variant.price || 0,
                    original_data: {
                        shopify_id: p.id,
                        handle: p.handle,
                        product_type: p.product_type,
                        vendor: p.vendor,
                        body_html: p.body_html,
                        tags: p.tags,
                        url: `${baseUrl}/products/${p.handle}`
                    }
                }
            })

            // 6. Insert Batch
            const { error: insertError } = await supabaseAdmin
                .from('external_products')
                .insert(mappedProducts)

            if (insertError) {
                console.error('Insert Error:', insertError)
                throw insertError
            }

            totalIngested += mappedProducts.length
            console.log(`Ingested ${mappedProducts.length} products (Total: ${totalIngested})`)

            page++

            // Safety break to prevent infinite loops or timeouts
            if (page > 20) { // Limit to 5000 products for now
                console.log('Hit safety page limit (20). Stopping.')
                break
            }
        }

        return new Response(
            JSON.stringify({ message: 'Ingestion successful', count: totalIngested }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        console.error('Function Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
