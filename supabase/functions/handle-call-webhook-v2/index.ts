import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const caCodes = ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'];

serve(async (req) => {
    try {
        const body = await req.json();
        console.log(`Webhook Received: type=${body.type}, callId=${body.call?.id}`);

        const { type, call, toolCalls, transcript, message } = body;

        // Helper to get call object from various Vapi payload structures
        const callObj = call || message?.call || body.call;
        const typeObj = type || message?.type || body.type;

        // Vapi sends "tool-calls" for real-time execution
        const actualToolCalls = toolCalls || message?.toolCalls || callObj?.toolCalls;
        if (actualToolCalls) console.log(`Tool Calls detected: ${actualToolCalls.length}`);

        if (typeObj === 'tool-calls' || actualToolCalls) {
            const results = [];
            for (const tc of (actualToolCalls || [])) {
                if (tc.function?.name === 'sendSms') {
                    // FIX: Vapi sends arguments as a JSON string
                    let args;
                    try {
                        args = typeof tc.function.arguments === 'string'
                            ? JSON.parse(tc.function.arguments)
                            : tc.function.arguments;
                    } catch (e) {
                        console.error('Failed to parse arguments:', tc.function.arguments);
                        args = {};
                    }
                    console.log('Sending SMS. Payload:', JSON.stringify(args));
                    const { phoneNumber, message: smsMessage } = args;

                    const sid = (Deno.env.get('TWILIO_ACCOUNT_SID') || '').trim();
                    const token = (Deno.env.get('TWILIO_AUTH_TOKEN') || '').trim();
                    let from = (Deno.env.get('TWILIO_PHONE_NUMBER') || '').trim();

                    // Canadian Routing
                    if (phoneNumber && phoneNumber.startsWith('+1')) {
                        const area = phoneNumber.substring(2, 5);
                        if (caCodes.includes(area)) {
                            const caNumber = Deno.env.get('TWILIO_PHONE_NUMBER_CA');
                            if (caNumber) from = caNumber.trim();
                        }
                    }

                    // Helper: Normalize sender number for Twilio (must start with +)
                    if (from && !from.startsWith('+')) {
                        from = from.length === 10 ? `+1${from}` : `+${from}`;
                    }

                    if (from && sid && token) {
                        console.log(`Attempting to send SMS from: ${from} to: ${phoneNumber}`);
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

                            // Optional: Update DB that SMS was sent
                            try {
                                const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
                                await sb.from('call_logs').update({
                                    communication_sent: 'Sent SMS with link'
                                }).eq('provider_call_id', call?.id || message?.call?.id || body.call?.id);
                            } catch (dbErr) {
                                console.error('Database logging error:', dbErr);
                            }
                        } else {
                            const errTxt = await twRes.text();
                            console.error(`Twilio Error for ${phoneNumber}: ${errTxt}`);
                            results.push({ toolCallId: tc.id, error: "Twilio Error: " + errTxt });

                            // Log Failure to DB
                            try {
                                const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
                                await sb.from('call_logs').update({
                                    communication_sent: `SMS FAILED: ${errTxt.substring(0, 50)}`
                                }).eq('provider_call_id', call?.id || message?.call?.id || body.call?.id);
                            } catch (dbErr) {
                                console.error('Database logging error:', dbErr);
                            }
                        }
                    } else {
                        results.push({ toolCallId: tc.id, error: "Missing Twilio credentials or sender number" });
                    }
                } else if (tc.function?.name === 'reportIssue') {
                    console.log('Processing reportIssue tool call');
                    const args = typeof tc.function.arguments === 'string'
                        ? JSON.parse(tc.function.arguments)
                        : tc.function.arguments;

                    const prospectId = body.call?.metadata?.prospectId || body.message?.metadata?.prospectId;
                    const customer = body.call?.customer || body.message?.call?.customer; // Try multiple paths

                    const payload = {
                        ...args,
                        prospectId,
                        customerName: customer?.name,
                        customerPhone: customer?.number
                    };

                    console.log('Forwarding to report-issue function:', JSON.stringify(payload));

                    try {
                        const reportRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/report-issue`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, // Use Service Role for internal call
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(payload)
                        });

                        const reportData = await reportRes.json();

                        if (reportRes.ok) {
                            results.push({
                                toolCallId: tc.id,
                                result: `Issue reported successfully. Ticket ID: ${reportData.mondayItemId || 'Created'}`
                            });
                        } else {
                            results.push({
                                toolCallId: tc.id,
                                error: `Failed to report issue: ${reportData.error || 'Unknown error'}`
                            });
                        }
                    } catch (err) {
                        console.error('Error calling report-issue:', err);
                        results.push({ toolCallId: tc.id, error: "Internal Error reporting issue" });
                    }
                }
                else if (tc.function?.name === 'offerDiscount') {
                    console.log('Processing offerDiscount tool call');
                    const args = typeof tc.function.arguments === 'string'
                        ? JSON.parse(tc.function.arguments)
                        : tc.function.arguments;

                    const newPrice = args.newPrice;
                    const sessionId = body.call?.metadata?.prospectId || body.message?.metadata?.prospectId;

                    console.log(`Applying discount: $${newPrice} to Session: ${sessionId}`);

                    if (sessionId && newPrice) {
                        try {
                            const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

                            // Upsert session to support CSV/Demo flows
                            const { error: updateError } = await sb
                                .from('warranty_sessions')
                                .upsert({
                                    id: sessionId,
                                    customer_name: (body.call?.customer?.name || "Valued Customer"),
                                    current_price: newPrice,
                                    status: 'discounted'
                                }, { onConflict: 'id' });

                            if (updateError) {
                                console.error('Error updating session:', updateError);
                                results.push({ toolCallId: tc.id, error: "Failed to apply discount in DB" });
                            } else {
                                console.log('Discount applied successfully.');
                                results.push({ toolCallId: tc.id, result: "Discount applied! The customer's screen has been updated." });
                            }
                        } catch (err) {
                            console.error('Internal error applying discount:', err);
                            results.push({ toolCallId: tc.id, error: "Internal Error applying discount" });
                        }
                    } else {
                        results.push({ toolCallId: tc.id, error: "Missing sessionId (prospectId) or newPrice" });
                    }
                }
            } // End of loop
            return new Response(JSON.stringify({ results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (typeObj === 'end-of-call-report' || typeObj === 'call-update') {
            const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
            console.log(`Processing End of Call. Call ID: ${callObj?.id}`);
            console.log(`Call Ended Reason: ${callObj?.endedReason}, Raw Duration: ${callObj?.duration}`);

            const status = (callObj?.endedReason === 'customer-ended-call' || callObj?.endedReason === 'assistant-ended-call' ? 'SUCCESS' : 'FAIL');

            // Format Duration to M:SS
            const durationSeconds = Math.floor(callObj?.duration || 0);
            const minutes = Math.floor(durationSeconds / 60);
            const seconds = durationSeconds % 60;
            const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            // --- OUTCOME DETECTION LOGIC ---
            // 1. Default to 'completed'
            let outcome = 'completed';

            // 2. Check for "Issue Reported" (if the tool was called)
            const summary = callObj?.analysis?.summary || body.summary || '';
            const structuredOutcome = callObj?.analysis?.structuredData?.outcome || '';

            if (summary.toLowerCase().includes('issue') || summary.toLowerCase().includes('problem')) {
                outcome = 'issue';
            }

            // 3. Check for "Sale" (Payment Link Sent)
            const toolsUsed = callObj?.toolCalls || [];
            const linkSent = toolsUsed.some((t: any) => t.function?.name === 'sendSms'); // sendSms implies link sent in our current flow

            if (linkSent) {
                outcome = 'sale'; // "Pitched / Link Sent" counts as Sale for this stage
            }

            // --- LOG TO DB ---
            await sb.from('call_logs').update({
                duration: formattedDuration, // Formatted as M:SS
                connection_status: status,
                transcript: transcript || '', // transcript might be top-level or in callObj. leaving as is if destructured.
                outcome: outcome
            }).eq('provider_call_id', callObj?.id);

            // --- SALES LOGGING DISABLED ---
            // User requested to pause automated sales ticketing until flow is defined.
            if (outcome === 'sale') {
                console.log('Outcome is SALE - (CRM logging disabled)');
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (e) {
        console.error('Webhook Error:', e.message);
        return new Response(JSON.stringify({ error: e.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });
    }
})

