import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const caCodes = ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'];

serve(async (req) => {
    try {
        const body = await req.json();
        console.log(`Webhook Received: type=${body.type}, callId=${body.call?.id}`);

        const { type, call, toolCalls, transcript, message } = body;

        // Vapi sends "tool-calls" for real-time execution
        const actualToolCalls = toolCalls || message?.toolCalls;
        if (actualToolCalls) console.log(`Tool Calls detected: ${actualToolCalls.length}`);

        if (type === 'tool-calls' || actualToolCalls) {
            const results = [];
            for (const tc of (actualToolCalls || [])) {
                if (tc.function?.name === 'sendSms') {
                    const { phoneNumber, message: smsMessage } = tc.function.arguments;

                    const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
                    const token = Deno.env.get('TWILIO_AUTH_TOKEN');
                    let from = Deno.env.get('TWILIO_PHONE_NUMBER');

                    // Canadian Routing
                    if (phoneNumber && phoneNumber.startsWith('+1')) {
                        const area = phoneNumber.substring(2, 5);
                        if (caCodes.includes(area)) {
                            from = Deno.env.get('TWILIO_PHONE_NUMBER_CA');
                        }
                    }

                    if (from && sid && token) {
                        const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: new URLSearchParams({ To: phoneNumber, From: from, Body: smsMessage })
                        });

                        if (twRes.ok) {
                            console.log(`SMS successfully sent to ${phoneNumber}`);
                            results.push({ toolCallId: tc.id, result: "SMS sent successfully" });
                        } else {
                            const errTxt = await twRes.text();
                            console.error(`Twilio Error for ${phoneNumber}: ${errTxt}`);
                            results.push({ toolCallId: tc.id, error: "Twilio Error: " + errTxt });
                        }
                    } else {
                        results.push({ toolCallId: tc.id, error: "Missing Twilio credentials or sender number" });
                    }
                }
            }
            return new Response(JSON.stringify({ results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (type === 'end-of-call-report' || type === 'call-update') {
            const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
            const status = (call?.endedReason === 'customer-ended-call' || call?.endedReason === 'assistant-ended-call' ? 'SUCCESS' : 'FAIL');

            // Check if SMS was sent in this call context
            let linkSent = false;
            // Note: We could check actualToolCalls here too if it's an update

            await sb.from('call_logs').update({
                duration: Math.floor(call?.duration || 0) + "s",
                connection_status: status,
                transcript: transcript || ''
            }).eq('provider_call_id', call?.id);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        console.error('Webhook Error:', e.message);
        return new Response(JSON.stringify({ error: e.message }), { status: 200 });
    }
})
