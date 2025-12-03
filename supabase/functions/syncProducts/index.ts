import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Create Supabase client with Service Role Key
        // We use Service Role to bypass RLS because the user is authenticated via Firebase,
        // so we don't have a valid Supabase session token to verify.
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? ''
        )

        // 3. Parse request body
        const { products, user_id } = await req.json()

        if (!products || !Array.isArray(products)) {
            throw new Error('Invalid request body: "products" array is required')
        }

        if (!user_id) {
            throw new Error('Invalid request body: "user_id" is required')
        }

        // 4. Prepare data for upsert
        // Inject the user_id from the request body into every product
        const productsToUpsert = products.map(p => ({
            id: p.id,
            user_id: user_id, // Use the user_id passed from the client
            name: p.name,
            description: p.description,
            price: p.price,
            imageUrl: p.imageUrl,
            originalStoreUrl: p.originalStoreUrl,
            category: p.category,
            brand: p.brand,
            sku: p.sku,
            shopifyProductId: p.shopifyProductId,
            platform: p.platform,
            createdAt: p.createdAt,
            updatedAt: new Date().toISOString()
        }))

        // 5. Perform Bulk Upsert
        const { data, error } = await supabaseAdmin
            .from('products')
            .upsert(productsToUpsert, { onConflict: 'id' })
            .select()

        if (error) throw error

        // 6. Trigger Auto-Enrichment (Fire and Forget)
        // We don't await this because we don't want to delay the sync response.
        // We pass the Authorization header so the function has permission to run.
        console.log('Triggering auto-enrichment...')
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enrichProducts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json'
            }
        }).catch(err => console.error('Failed to trigger enrichment:', err))

        return new Response(
            JSON.stringify({
                message: 'Sync successful',
                inserted: data?.length ?? 0,
                updated: 0,
                total: productsToUpsert.length
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
