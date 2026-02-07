
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// HARDCODED CONFIG FOR RELIABILITY
const SUPABASE_URL = 'https://tikocqefwifjcfhgqdyj.supabase.co';
const caCodes = ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'];

serve(async (req) => {
    try {
        const body = await req.json();
        const { type, call, toolCalls, message } = body;
        const callObj = call || message?.call || body.call;
        const typeObj = type || message?.type || body.type;
        const actualToolCalls = toolCalls || message?.toolCalls || callObj?.toolCalls;

        if (typeObj === 'tool-calls' || actualToolCalls) {
            const results = [];
            for (const tc of (actualToolCalls || [])) {
                if (tc.function?.name === 'sendSms') {
                    // SENT SMS LOGIC
                    let args;
                    try { args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments; } catch (e) { args = {}; }

                    const { phoneNumber, message: smsMessage } = args;
                    const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
                    const token = Deno.env.get('TWILIO_AUTH_TOKEN');
                    let from = Deno.env.get('TWILIO_PHONE_NUMBER');

                    if (phoneNumber && phoneNumber.startsWith('+1') && caCodes.includes(phoneNumber.substring(2, 5))) {
                        const ca = Deno.env.get('TWILIO_PHONE_NUMBER_CA');
                        if (ca) from = ca;
                    }
                    if (from && !from.startsWith('+')) from = from.length === 10 ? `+1${from}` : `+${from}`;

                    if (from && sid && token) {
                        const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
                            method: 'POST',
                            headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({ To: phoneNumber, From: from, Body: smsMessage })
                        });
                        if (twRes.ok) {
                            results.push({ toolCallId: tc.id, result: "SMS sent successfully" });
                        } else {
                            results.push({ toolCallId: tc.id, error: "Twilio Error: " + await twRes.text() });
                        }
                    } else {
                        results.push({ toolCallId: tc.id, error: "Missing Twilio credentials" });
                    }

                } else if (tc.function?.name === 'reportIssue') {
                    // REPORT ISSUE LOGIC
                    const args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                    const prospectId = body.call?.metadata?.prospectId || body.message?.metadata?.prospectId;
                    const customer = body.call?.customer || body.message?.call?.customer;

                    const payload = { ...args, prospectId, customerName: customer?.name, customerPhone: customer?.number };

                    // DIRECT FETCH TO REPORT-ISSUE
                    try {
                        const reportRes = await fetch(`${SUPABASE_URL}/functions/v1/report-issue`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(payload)
                        });
                        const reportData = await reportRes.json();
                        if (reportRes.ok) {
                            results.push({ toolCallId: tc.id, result: `Issue reported successfully. Ticket ID: ${reportData.ticketId || reportData.mondayItemId || 'Created'}` });
                        } else {
                            results.push({ toolCallId: tc.id, error: `Failed to report issue: ${JSON.stringify(reportData)}` });
                        }
                    } catch (err) {
                        console.error('Report Issue Fetch Error:', err);
                        results.push({ toolCallId: tc.id, error: "Internal Error reporting issue: " + err.message });
                    }

                } else if (tc.function?.name === 'offerDiscount') {
                    // DISCOUNT LOGIC
                    const args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                    const newPrice = args.newPrice;
                    const sessionId = body.call?.metadata?.prospectId || body.message?.metadata?.prospectId;

                    if (sessionId && newPrice) {
                        const sb = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
                        await sb.from('warranty_sessions').upsert({ id: sessionId, customer_name: (body.call?.customer?.name || "Valued Customer"), current_price: newPrice, status: 'discounted' }, { onConflict: 'id' });
                        results.push({ toolCallId: tc.id, result: "Discount applied!" });
                    } else {
                        results.push({ toolCallId: tc.id, error: "Missing sessionId or newPrice" });
                    }
                }
            }
            return new Response(JSON.stringify({ results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (typeObj === 'end-of-call-report' || typeObj === 'call-update') {
            // LOGGING LOGIC
            const sb = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

            // Outcome Detection
            let outcome = 'completed';
            const summary = callObj?.analysis?.summary || body.summary || '';
            if (summary.toLowerCase().includes('issue') || summary.toLowerCase().includes('problem')) outcome = 'issue';

            const toolsUsed = callObj?.toolCalls || [];
            if (toolsUsed.some((t: any) => t.function?.name === 'sendSms')) outcome = 'sale';

            await sb.from('call_logs').update({
                duration: `${Math.floor((callObj?.duration || 0) / 60)}:${Math.floor((callObj?.duration || 0) % 60).toString().padStart(2, '0')}`,
                connection_status: (callObj?.endedReason === 'customer-ended-call' || callObj?.endedReason === 'assistant-ended-call' ? 'SUCCESS' : 'FAIL'),
                transcript: body.transcript || '',
                outcome: outcome
            }).eq('provider_call_id', callObj?.id);
        }

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' }, status: 200 });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { headers: { 'Content-Type': 'application/json' }, status: 200 });
    }
})
