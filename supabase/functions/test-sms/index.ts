import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { to, message } = await req.json();

        const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const token = Deno.env.get('TWILIO_AUTH_TOKEN');
        let from = Deno.env.get('TWILIO_PHONE_NUMBER');

        // Auto-detect Canadian routing for test
        const caCodes = ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'];

        if (to.startsWith('+1')) {
            const area = to.substring(2, 5);
            if (caCodes.includes(area)) {
                from = Deno.env.get('TWILIO_PHONE_NUMBER_CA') || from;
                console.log('Using Canadian Sender:', from);
            }
        }

        if (!sid || !token || !from) {
            throw new Error(`Missing Twilio credentials: SID=${!!sid}, Token=${!!token}, From=${from}`);
        }

        const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ To: to, From: from, Body: message || 'Test SMS from Supabase' })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(`Twilio Error: ${JSON.stringify(data)}`);

        return new Response(JSON.stringify({ success: true, data }), { headers: corsHeaders });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { headers: corsHeaders, status: 200 });
    }
})
