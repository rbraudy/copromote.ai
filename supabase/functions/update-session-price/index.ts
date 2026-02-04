
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { sessionId, newPrice, create, customerName } = await req.json()

        if (create) {
            // Mode: Create Session
            const { data, error } = await supabase
                .from('warranty_sessions')
                .insert({
                    customer_name: customerName || "Demo Customer",
                    current_price: 199,
                    status: 'active'
                })
                .select()
                .single()

            if (error) throw error
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (!sessionId || !newPrice) {
            throw new Error('Missing sessionId or newPrice')
        }

        const { data, error } = await supabase
            .from('warranty_sessions')
            .update({ current_price: newPrice, status: 'discounted' })
            .eq('id', sessionId)
            .select()

        if (error) throw error

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
