
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        // Get last 10 logs to be sure
        const { data: logs, error } = await sb
            .from('call_logs')
            .select('id, created_at, connection_status, communication_sent, provider_call_id')
            .order('created_at', { ascending: false })
            .limit(10);

        // Check Secrets Existence (Bool only to be safe)
        const secrets = {
            SID: !!Deno.env.get('TWILIO_ACCOUNT_SID'),
            TOKEN: !!Deno.env.get('TWILIO_AUTH_TOKEN'),
            PH_US: !!Deno.env.get('TWILIO_PHONE_NUMBER'),
            PH_CA: !!Deno.env.get('TWILIO_PHONE_NUMBER_CA'),
            PH_CA_VAL: Deno.env.get('TWILIO_PHONE_NUMBER_CA') // Peek at CA number to ensure it looks right
        };

        return new Response(JSON.stringify({ success: true, secrets, logs, error }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
})
