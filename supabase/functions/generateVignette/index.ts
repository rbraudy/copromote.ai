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
        const { bundle, style = 'photorealistic', setting = 'modern kitchen', type = 'combined' } = await req.json()

        if (!bundle) throw new Error('Missing bundle data')

        // 1. Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, serviceKey)

        // 2. Fetch Product Details (to get images/descriptions)
        console.log(`Fetching details for Seller Product: ${bundle.seller_product_id} and Partner Product: ${bundle.customer_product_id}`)

        const { data: sellerProduct, error: sellerError } = await supabase
            .from('products')
            .select('*')
            .eq('id', bundle.seller_product_id)
            .single()

        if (sellerError) console.error('Error fetching seller product:', sellerError)

        const { data: customerProduct, error: customerError } = await supabase
            .from('external_products')
            .select('*')
            .eq('id', bundle.customer_product_id)
            .single()

        if (customerError) console.error('Error fetching partner product:', customerError)

        if (!sellerProduct) {
            throw new Error(`Seller product not found: ${bundle.seller_product_id}`)
        }
        if (!customerProduct) {
            throw new Error(`Partner product not found: ${bundle.customer_product_id}`)
        }

        // 3. Construct Prompt
        const cleanDesc1 = sellerProduct.description?.replace(/<[^>]*>?/gm, '').substring(0, 100) || '';
        const cleanDesc2 = customerProduct.original_data?.body_html?.replace(/<[^>]*>?/gm, '').substring(0, 100) || '';

        // Use object_name if available for stronger visual grounding
        const obj1 = sellerProduct.object_name || sellerProduct.name;
        const obj2 = customerProduct.object_name || customerProduct.title;

        let prompt = '';
        // Updated style instructions to force smaller subject size and prevent cropping
        const styleInstructions = "wide angle shot, camera zoomed out, product centered with ample negative space around it, entire object fully visible, not cropped, 50% padding, clean, well-lit, real-world setting, natural lighting, realistic shadows, high resolution, 4k";

        if (type === 'solo') {
            prompt = `Professional product photo of ${obj1} alone on a ${setting} table. ${cleanDesc1}. ${styleInstructions}.`;
        } else {
            // Combined
            prompt = `Split composition showing two distinct products side-by-side on a ${setting} table. Left side: ${obj1} (${cleanDesc1}). Right side: ${obj2} (${cleanDesc2}). ${styleInstructions}.`;
        }

        console.log(`Generating ${type} Vignette with Prompt:`, prompt)

        // 4. Generate Image URL (Pollinations.ai - Flux)
        const encodedPrompt = encodeURIComponent(prompt.substring(0, 500)); // Strict 500 char limit for URL stability
        const seed = Math.floor(Math.random() * 1000000);

        // Using 'flux' explicitly for better quality than turbo
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&seed=${seed}&model=flux`;

        console.log('Generated Pollinations URL:', imageUrl)

        return new Response(
            JSON.stringify({
                imageUrl: imageUrl,
                promptUsed: prompt
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
