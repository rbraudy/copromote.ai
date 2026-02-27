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
        const { leadId, sellerId } = await req.json()

        if (!leadId || !sellerId) {
            throw new Error('Missing leadId or sellerId')
        }

        // 1. Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, serviceKey)

        // 2. Fetch Seller Products (My Products)
        console.log('Fetching seller products for:', sellerId)
        // Note: products table uses "imageUrl" (camelCase) but user_id (snake_case)
        const { data: myProducts, error: myError } = await supabase
            .from('products')
            .select('id, name, description, object_name, core_product_use, price, "imageUrl"')
            .eq('user_id', sellerId) // Fixed: userId -> user_id
            .limit(100)

        if (myError) {
            console.error('Error fetching myProducts:', myError)
            throw new Error(`Failed to fetch seller products: ${myError.message}`)
        }
        console.log('Fetched myProducts:', myProducts?.length)

        // 3. Fetch Partner Products (Their Products)
        console.log('Fetching partner products for lead:', leadId)
        // Note: external_products uses snake_case columns (image_url)
        const { data: partnerProducts, error: partnerError } = await supabase
            .from('external_products')
            .select('id, title, original_data, object_name, core_product_use, price, image_url')
            .eq('lead_id', leadId)
            .limit(100)

        if (partnerError) {
            console.error('Error fetching partnerProducts:', partnerError)
            throw new Error(`Failed to fetch partner products: ${partnerError.message}`)
        }
        console.log('Fetched partnerProducts:', partnerProducts?.length)

        if (!myProducts?.length || !partnerProducts?.length) {
            console.error('Insufficient products:', { myProducts: myProducts?.length, partnerProducts: partnerProducts?.length })
            throw new Error('Insufficient products to generate bundles. Make sure both catalogs are enriched.')
        }

        console.log(`Generating bundles for ${myProducts.length} my products and ${partnerProducts.length} partner products...`)

        // 4. Prepare AI Prompt
        const myList = myProducts.map(p =>
            `- ID: ${p.id}, Name: ${p.name}, Object: ${p.object_name}, Core Use: ${p.core_product_use}, Price: $${p.price}`
        ).join('\n')

        const partnerList = partnerProducts.map(p =>
            `- ID: ${p.id}, Name: ${p.title}, Object: ${p.object_name}, Core Use: ${p.core_product_use}, Price: $${p.price}`
        ).join('\n')

        const prompt = `
        You are an expert retail merchandiser AI creating product bundles. Your task is to analyze the seller's product catalog and the customer's product catalog, then create up to 25 of the most highly complementary two-product bundles (one product from seller + one from customer).

        CRITICAL: Prioritize products that are COMMONLY USED TOGETHER in real-world scenarios. Focus on natural pairings where the products physically work together or are used in the same activity.

        Examples of GOOD pairings:
        - Ladle + Soup Pot (ladle is used to serve from pot)
        - Ladle + Punch Bowl (ladle is used to serve from bowl)
        - Cutting Board + Knife (used together for food prep)
        - Paella Pan + Spatula (spatula is used to serve from pan)
        - Coffee Mug + Coffee Maker (directly used together)

        Examples of BAD pairings:
        - Ladle + Hot Chocolate Powder (not commonly used together - you don't need a ladle for hot chocolate)
        - Fork + Blender (not used together in any scenario)
        - Plate + Oven (not directly used together)

        Seller's Product Catalog:
        ${myList}

        Customer's Product Catalog:
        ${partnerList}

        Rules:
        1. Prioritize products that are COMMONLY USED TOGETHER in real-world scenarios
        2. Consider physical compatibility and practical use cases
        3. Think about the typical workflow or activity where both products would be used simultaneously
        4. Each bundle should represent products that naturally belong together
        5. Provide a compelling bundle title and description
        6. Suggest a discount percentage (10-30%) and minimum order quantity (1-10)
        7. Explain why the pairing makes practical sense

        Return your response as a JSON array with this exact structure:
        [
          {
            "seller_product_id": "seller-uuid-here",
            "customer_product_id": "customer-uuid-here",
            "bundle_title": "Bundle Title",
            "bundle_description": "Why this bundle makes sense",
            "discount_percentage": 15,
            "minimum_order_quantity": 2,
            "complementary_reasoning": "Brief explanation of why these products work together"
          }
        ]

        Only return valid JSON, no other text.
        `

        console.log('Sending request to Gemini...')
        // 5. Call Gemini
        const geminiKey = Deno.env.get('GEMINI_API_KEY')!
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })

        if (!response.ok) {
            const errText = await response.text()
            console.error('Gemini API Error Status:', response.status)
            console.error('Gemini API Error Body:', errText)
            throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`)
        }

        const aiData = await response.json()
        console.log('Gemini response received')
        const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text

        if (!aiText) {
            console.error('No text in AI response:', JSON.stringify(aiData))
            throw new Error('No content returned from AI')
        }

        const jsonStr = aiText.replace(/```json/g, '').replace(/```/g, '').trim()
        console.log('Parsing JSON string length:', jsonStr.length)

        let suggestions;
        try {
            suggestions = JSON.parse(jsonStr)
        } catch (e) {
            console.error('Failed to parse AI JSON:', jsonStr)
            throw new Error('Failed to parse AI response JSON')
        }

        // Enrich suggestions with real product data (Images, Names)
        console.log('Enriching suggestions...')
        suggestions = suggestions.map((s: any) => {
            const sellerP = myProducts.find(p => p.id === s.seller_product_id)
            const partnerP = partnerProducts.find(p => p.id === s.customer_product_id)

            if (!sellerP || !partnerP) {
                console.warn('Skipping invalid suggestion (product not found):', s)
                return null
            }

            return {
                ...s,
                seller_product_name: sellerP.name,
                seller_product_image: sellerP.imageUrl,
                seller_product_price: sellerP.price,
                partner_product_name: partnerP.title,
                partner_product_image: partnerP.image_url,
                partner_product_price: partnerP.price
            }
        }).filter((s: any) => s !== null)

        console.log('Returning success response')
        return new Response(
            JSON.stringify({ suggestions }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Catch Block Error:', error)
        return new Response(
            JSON.stringify({ error: error.message, stack: error.stack }), // Return detailed error
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
