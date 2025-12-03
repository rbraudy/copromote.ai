import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        const body = await req.json()
        console.log('Webhook received:', JSON.stringify(body))

        // Vapi sends different message types. We care about 'end-of-call-report' or similar.
        // Structure: { message: { type: '...', call: { ... } } }
        const message = body.message
        if (!message || message.type !== 'end-of-call-report') {
            return new Response('Ignored', { status: 200 })
        }

        const call = message.call
        if (!call) {
            return new Response('No call data', { status: 200 })
        }

        // 1. Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, serviceKey)

        // 2. Update Call Log
        const { error } = await supabase
            .from('call_logs')
            .update({
                status: call.status, // e.g. 'ended'
                outcome: call.analysis?.summary || call.endedReason,
                transcript: call.transcript,
                recording_url: call.recordingUrl,
                updated_at: new Date().toISOString()
            })
            .eq('provider_call_id', call.id)

        if (error) {
            console.error('Error updating call log:', error)
            throw error
        }

        return new Response('OK', { status: 200 })

    } catch (error: any) {
        console.error('Webhook Error:', error)
        return new Response(error.message, { status: 500 })
    }
})
