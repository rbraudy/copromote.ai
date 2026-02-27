
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
}

// Advanced Debug Logger
const logDebug = async (sb: any, functionName: string, errorType: string, payload: any, rawResponse?: string, error?: any) => {
    try {
        await sb.from('system_debug_logs').insert({
            function_name: functionName,
            error_type: errorType,
            payload: payload,
            raw_response: rawResponse,
            stack_trace: error?.stack || error?.message,
            metadata: { timestamp: new Date().toISOString() }
        });
    } catch (e) {
        console.error('CRITICAL: Debug Logger Failed:', e);
    }
};

// @ts-ignore
serve(async (req: any) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        // console.log('Webhook Body:', JSON.stringify(body));

        const { type, call, toolCalls, message } = body;
        const callObj = call || message?.call || body.call;
        const typeObj = type || message?.type || body.type;
        const actualToolCalls = toolCalls || message?.toolCalls || callObj?.toolCalls;

        // @ts-ignore
        const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        // Helper: Get Integrations
        const getIntegration = async (companyId: string, provider: string) => {
            if (!companyId) return null;
            const { data } = await sb.from('integrations')
                .select('credentials')
                .eq('company_id', companyId)
                .eq('provider', provider)
                .eq('is_enabled', true)
                .single();
            return data?.credentials;
        };

        if (typeObj === 'tool-calls' || actualToolCalls) {
            const results = [];
            const companyId = callObj?.metadata?.companyId || message?.metadata?.companyId;

            for (const tc of (actualToolCalls || [])) {

                // --- TOOL: sendSms ---
                if (tc.function?.name === 'sendSms') {
                    let args;
                    try { args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments; } catch (e) { args = {}; }
                    const phoneNumber = args.phoneNumber || args.number || args.recipient || args.to || args.phone;
                    const smsMessage = args.message || args.body || args.content || args.text || args.smsMessage;

                    console.log(`[SMS_DEBUG] Attempting to send to: ${phoneNumber} | Params: ${JSON.stringify(args)}`);
                    await logDebug(sb, 'handle-campaign-webhook', 'SMS_Tool_Payload', { phoneNumber, smsMessage, fullArgs: args });

                    // 1. Try DB Integration first
                    let sid, token, from;
                    const twilioConfig = await getIntegration(companyId, 'twilio');

                    if (twilioConfig) {
                        sid = twilioConfig.accountSid;
                        token = twilioConfig.authToken;
                        from = twilioConfig.phoneNumber;
                    } else {
                        // 2. Fallback to Env Vars (Henry's Legacy)
                        // @ts-ignore
                        sid = Deno.env.get('TWILIO_ACCOUNT_SID');
                        // @ts-ignore
                        token = Deno.env.get('TWILIO_AUTH_TOKEN');
                        // @ts-ignore
                        from = Deno.env.get('TWILIO_PHONE_NUMBER');

                        // Canadian Number Logic for Fallback
                        const caCodes = ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'];
                        if (phoneNumber && phoneNumber.startsWith('+1') && caCodes.includes(phoneNumber.substring(2, 5))) {
                            // @ts-ignore
                            const ca = Deno.env.get('TWILIO_PHONE_NUMBER_CA');
                            if (ca) from = ca;
                        }
                    }

                    if (from && !from.startsWith('+')) from = from.length === 10 ? `+1${from}` : `+${from}`;

                    if (from && sid && token) {
                        const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
                            method: 'POST',
                            headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({ To: phoneNumber, From: from, Body: smsMessage })
                        });

                        // Logging for debug
                        console.log(`Sending SMS to ${phoneNumber} via ${twilioConfig ? 'DB Config' : 'Env Vars'}. Status: ${twRes.status}`);

                        if (twRes.ok) {
                            results.push({ toolCallId: tc.id, result: "SMS sent successfully" });
                        } else {
                            await logDebug(sb, 'handle-campaign-webhook', 'Twilio_Error', { phoneNumber, from, sid }, await twRes.text());
                            results.push({ toolCallId: tc.id, error: "Twilio Error: failed" });
                        }
                    } else {
                        results.push({ toolCallId: tc.id, error: "Missing Twilio credentials (DB or Env)" });
                    }

                    // --- TOOL: reportIssue ---
                } else if (tc.function?.name === 'reportIssue') {
                    const args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                    const prospectId = callObj?.metadata?.prospectId || message?.metadata?.prospectId;
                    const customer = callObj?.customer || message?.call?.customer;

                    const payload = { ...args, prospectId, customerName: customer?.name, customerPhone: customer?.number, companyId };

                    // Reuse existing report-issue function (which should eventually be generic too)
                    try {
                        // @ts-ignore
                        const reportRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/report-issue`, {
                            method: 'POST',
                            headers: {
                                // @ts-ignore
                                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, // Use Service Role to bypass RLS for internal call
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
                    } catch (err: any) {
                        console.error('Report Issue Fetch Error:', err);
                        results.push({ toolCallId: tc.id, error: "Internal Error reporting issue: " + err.message });
                    }

                    // --- TOOL: offerDiscount ---
                } else if (tc.function?.name === 'offerDiscount') {
                    // @ts-ignore
                    const args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                    const newPrice = args.newPrice;
                    const sessionId = callObj?.metadata?.prospectId || message?.metadata?.prospectId; // Using Prospect ID as Session ID for simplicity?

                    if (sessionId && newPrice) {
                        // Assuming warranty_sessions table or just updating prospect?
                        // For now staying with original logic but using 'warranty_prospects' if 'warranty_sessions' doesn't exist?
                        // Original code referenced 'warranty_sessions', assuming it exists.
                        await sb.from('warranty_sessions')
                            .upsert({ id: sessionId, customer_name: (callObj?.customer?.name || "Valued Customer"), current_price: newPrice, status: 'discounted' }, { onConflict: 'id' });

                        results.push({ toolCallId: tc.id, result: "Discount applied!" });
                    } else {
                        results.push({ toolCallId: tc.id, error: "Missing sessionId or newPrice" });
                    }
                }
            }
            return new Response(JSON.stringify({ results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- CALL REPORTING ---
        if (typeObj === 'end-of-call-report' || typeObj === 'call-update') {

            // Outcome Detection
            let outcome = 'completed';
            const summary = callObj?.analysis?.summary || body.summary || '';
            if (summary.toLowerCase().includes('issue') || summary.toLowerCase().includes('problem')) outcome = 'issue';

            const toolsUsed = callObj?.toolCalls || [];
            if (toolsUsed.some((t: any) => t.function?.name === 'sendSms')) outcome = 'sale'; // Rough heuristic

            // Update Call Log
            const providerCallId = callObj?.id;
            if (providerCallId) {
                await sb.from('call_logs').update({
                    duration: `${Math.floor((callObj?.duration || 0) / 60)}:${Math.floor((callObj?.duration || 0) % 60).toString().padStart(2, '0')}`,
                    connection_status: (callObj?.endedReason === 'customer-ended-call' || callObj?.endedReason === 'assistant-ended-call' ? 'SUCCESS' : 'FAIL'),
                    transcript: body.transcript || callObj?.transcript || '',
                    outcome: outcome,
                    cost: callObj?.cost || 0
                }).eq('provider_call_id', providerCallId);

                // Log the full body to Super Logs with the specific reason in the title for visibility
                const reason = body.call?.endedReason || body.message?.call?.endedReason || 'unknown';
                await logDebug(sb, 'handle-campaign-webhook', `Call_Ended_Report (${reason})`, body);
            }
        }

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } catch (e: any) {
        const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        await logDebug(sb, 'handle-campaign-webhook', 'Webhook_Global_Error', {}, undefined, e);
        console.error('Webhook Error:', e);
        return new Response(JSON.stringify({ error: e.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
})
