import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const callLogId = url.searchParams.get('id');
        const prospectId = url.searchParams.get('prospectId');
        const redirectUrl = url.searchParams.get('redirect') || 'https://copromote.ai/henrys';

        // 1. Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceKey);

        let targetLogId = callLogId;

        // 2. If no callLogId but prospectId, find latest call log
        if (!targetLogId && prospectId) {
            const { data: latestLog } = await supabase
                .from('call_logs')
                .select('id')
                .eq('warranty_prospect_id', prospectId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (latestLog) {
                targetLogId = latestLog.id;
            }
        }

        // 3. Increment Link Clicks if we have a log ID
        if (targetLogId) {
            const { error } = await supabase.rpc('increment_link_clicks', { log_id: targetLogId });
            if (error) console.error('Error incrementing link clicks:', error);

            // Optional: Log the click event (could add a new table for finer analytics)
        }

        // 4. Redirect
        return Response.redirect(redirectUrl, 302);

    } catch (error: any) {
        console.error('Error tracking link click:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
