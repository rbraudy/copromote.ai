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
        let body = {};
        try { body = await req.json(); } catch (e) { /* ignore empty body */ }
        const { background } = body as any;

        // Core Logic Function
        const processBatch = async () => {
            try {
                // 1. Initialize Supabase Client
                const supabaseUrl = Deno.env.get('SUPABASE_URL')
                const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')

                if (!supabaseUrl) throw new Error('SUPABASE_URL is missing')
                if (!serviceKey) throw new Error('SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) is missing')

                const supabaseClient = createClient(supabaseUrl, serviceKey)

                // 2. Determine Target Table (Priority: User Products -> External Products)
                let targetTable = 'products'
                let idField = 'id'
                let nameField = 'name'
                let descField = 'description'
                const BATCH_SIZE = 50 // Increased back to 50 for speed

                // Check User Products
                let { data: products, error: fetchError } = await supabaseClient
                    .from('products')
                    .select('id, name, description')
                    .is('object_name', null)
                    .limit(BATCH_SIZE)

                if (fetchError) throw fetchError

                // If no user products need enrichment, check External Products
                if (!products || products.length === 0) {
                    console.log('No unenriched user products. Checking external_products...')
                    targetTable = 'external_products'
                    nameField = 'title'
                    descField = 'original_data'

                    const { data: externalProducts, error: extError } = await supabaseClient
                        .from('external_products')
                        .select('id, title, original_data')
                        .is('object_name', null)
                        .limit(BATCH_SIZE)

                    if (extError) throw extError
                    products = externalProducts || []
                }

                if (!products || products.length === 0) {
                    console.log('All products enriched.')
                    return { count: 0, message: 'Done' }
                }

                console.log(`Enriching ${products.length} items from ${targetTable}...`)

                // 3. Prepare Prompt for Gemini
                const productList = products.map((p: any) => {
                    const name = p[nameField]
                    let desc = ''
                    if (targetTable === 'products') {
                        desc = p[descField] || ''
                    } else {
                        desc = p.original_data?.body_html || ''
                        desc = desc.replace(/<[^>]*>?/gm, '').substring(0, 500)
                    }
                    return `ID: ${p.id}\nName: ${name}\nDesc: ${desc}`
                }).join('\n---\n')

                const prompt = `
            You are an expert retail merchandiser. For each product below, identify:
            1. "object_name": A clear, generic category name (1-3 words, e.g., "Running Shoe", "Ladle").
            2. "core_product_use": A concise description of its practical purpose (e.g., "Running on pavement", "Serving soup").

            Input Products:
            ${productList}

            Output Format:
            Return ONLY a JSON array of objects. Do not include markdown formatting.
            [
              { "id": "product_id", "object_name": "...", "core_product_use": "..." },
              ...
            ]
            `

                // 4. Call Gemini API
                const geminiKey = Deno.env.get('GEMINI_API_KEY')
                if (!geminiKey) throw new Error('GEMINI_API_KEY is missing')

                console.log('Calling Gemini API...')

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                })

                if (!response.ok) {
                    const errText = await response.text()
                    throw new Error(`Gemini API Error: ${response.status} - ${errText}`)
                }

                const aiData = await response.json()

                if (!aiData.candidates || !aiData.candidates[0]) {
                    throw new Error('Invalid Gemini Response: No candidates')
                }

                const aiText = aiData.candidates[0].content.parts[0].text
                const jsonStr = aiText.replace(/```json/g, '').replace(/```/g, '').trim()

                let enrichedData;
                try {
                    enrichedData = JSON.parse(jsonStr)
                } catch (e) {
                    console.error('JSON Parse Error:', e)
                    throw new Error(`Failed to parse AI JSON: ${jsonStr.substring(0, 100)}...`)
                }

                // 5. Update Database
                const updates = enrichedData.map(async (item: any) => {
                    return supabaseClient
                        .from(targetTable)
                        .update({
                            object_name: item.object_name,
                            core_product_use: item.core_product_use
                        })
                        .eq('id', item.id)
                })

                await Promise.all(updates)
                console.log(`Successfully enriched ${enrichedData.length} items.`)

                // 6. RECURSIVE TRIGGER (Fire and Forget)
                if (products.length > 0) {
                    console.log('Triggering next batch (background)...')
                    try {
                        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enrichProducts`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ background: true })
                        });
                    } catch (err) {
                        console.error('Failed to trigger next batch:', err);
                    }
                }

                return { count: enrichedData.length, message: 'Success' }

            } catch (err: any) {
                console.error('Batch Processing Error:', err)
                throw err
            }
        }

        // MAIN EXECUTION FLOW
        if (background) {
            // Background Mode: Return immediately, run in background
            console.log('Starting background processing...')
            // @ts-ignore
            EdgeRuntime.waitUntil(processBatch())

            return new Response(
                JSON.stringify({ message: 'Background processing started' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } else {
            // Foreground Mode (First Call): Wait for result
            console.log('Starting foreground processing...')
            const result = await processBatch()

            return new Response(
                JSON.stringify(result),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

    } catch (error: any) {
        console.error('Function Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
