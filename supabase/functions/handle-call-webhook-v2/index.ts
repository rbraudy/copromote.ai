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
                    // FIX: Vapi sends arguments as a JSON string
                    const args = typeof tc.function.arguments === 'string'
                        ? JSON.parse(tc.function.arguments)
                        : tc.function.arguments;
                    const { phoneNumber, message: smsMessage } = args;

                    const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
                    const token = Deno.env.get('TWILIO_AUTH_TOKEN');
                    let from = Deno.env.get('TWILIO_PHONE_NUMBER');

                    // Canadian Routing
                    if (phoneNumber && phoneNumber.startsWith('+1')) {
                        const area = phoneNumber.substring(2, 5);
                        if (caCodes.includes(area)) {
                            const caNumber = Deno.env.get('TWILIO_PHONE_NUMBER_CA');
                            if (caNumber) from = caNumber;
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
            }
            return new Response(JSON.stringify({ results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (type === 'end-of-call-report' || type === 'call-update') {
            const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
            const status = (call?.endedReason === 'customer-ended-call' || call?.endedReason === 'assistant-ended-call' ? 'SUCCESS' : 'FAIL');

            // --- OUTCOME DETECTION LOGIC ---
            // 1. Default to 'completed'
            let outcome = 'completed';

            // 2. Check for "Issue Reported" (if the tool was called)
            // We can check if 'toolCalls' array in the summary or previous logs contained reportIssue
            // Or roughly check the summary/transcript keywords if Vapi provides them here.
            // A better way is to rely on what happened.
            // For now, we'll check the summary text if available.
            const summary = call?.analysis?.summary || body.summary || '';
            const structuredOutcome = call?.analysis?.structuredData?.outcome || '';

            if (summary.toLowerCase().includes('issue') || summary.toLowerCase().includes('problem')) {
                outcome = 'issue';
            }

            // 3. Check for "Sale" (Payment Link Sent)
            // We can look at the 'toolCalls' in the message history or if we logged it previously.
            // Vapi's end-of-call-report usually includes a list of tool calls made during the call.
            // We will check call.toolCalls if available.
            const toolsUsed = call?.toolCalls || [];
            const linkSent = toolsUsed.some((t: any) => t.function?.name === 'sendSms'); // sendSms implies link sent in our current flow

            if (linkSent) {
                outcome = 'sale'; // "Pitched / Link Sent" counts as Sale for this stage
            }

            // --- LOG TO DB ---
            await sb.from('call_logs').update({
                duration: Math.floor(call?.duration || 0) + "s",
                connection_status: status,
                transcript: transcript || '',
                outcome: outcome,
                summary: summary
            }).eq('provider_call_id', call?.id);

            // --- LOG "SALE" TO MONDAY.COM ---
            if (outcome === 'sale') {
                console.log('Outcome is SALE - logging to Monday.com...');
                try {
                    const mondayApiKey = Deno.env.get('MONDAY_API_KEY');
                    const boardId = Deno.env.get('MONDAY_BOARD_ID');

                    if (mondayApiKey && boardId) {
                        const customer = call?.customer;
                        const productName = call?.metadata?.productName || "Warranty Item"; // Pass this in metadata if possible
                        const itemName = `Sale: ${productName} - ${customer?.name || customer?.number}`;

                        const createMutation = `
                          mutation {
                            create_item (
                              board_id: ${boardId},
                              item_name: "${itemName}",
                              column_values: "{\\"status\\": {\\"label\\": \\"Done\\"}}" 
                            ) {
                              id
                            }
                          }
                        `;
                        // Note: Status label "Done" or "Working on it" depends on Board config. Using simple creation for now.

                        await fetch('https://api.monday.com/v2', {
                            method: 'POST',
                            headers: {
                                'Authorization': mondayApiKey,
                                'Content-Type': 'application/json',
                                'API-Version': '2023-10'
                            },
                            body: JSON.stringify({ query: createMutation })
                        });
                        console.log('Monday.com Sales Item Created');
                    }
                } catch (mondayErr) {
                    console.error('Failed to log sale to Monday:', mondayErr);
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        console.error('Webhook Error:', e.message);
        return new Response(JSON.stringify({ error: e.message }), { status: 200 });
    }
})
