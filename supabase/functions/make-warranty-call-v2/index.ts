import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        console.log('Incoming Generic Request Body:', JSON.stringify(body));

        const phoneInput = (body.phone || body.phoneNumber || "").toString().trim();
        const pid = body.prospectId;

        // Validation
        if (!phoneInput) throw new Error('Request missing phone number');

        // Init Supabase
        const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        // 1. Phone Number Normalization (E.164)
        console.log(`Original phone input: "${phoneInput}"`);
        let tel = phoneInput.replace(/[^\d+]/g, '');
        if (tel.startsWith('+')) {
            tel = '+' + tel.substring(1).replace(/\+/g, '');
        } else {
            tel = '+' + (tel.length === 10 ? '1' : '') + tel;
        }
        if (!/^\+[1-9]\d{1,14}$/.test(tel)) {
            throw new Error(`Invalid phone number format. Normalized to: ${tel}`);
        }
        console.log(`Normalized Phone: "${tel}"`);

        // 2. Fetch Prospect & Company Data
        let prospect = null;
        let companyId = null;
        let template = null;

        if (pid) {
            console.log(`Fetching prospect: ${pid}`);
            const { data: pData, error: pError } = await sb.from('warranty_prospects')
                .select('*, companies(*)') // Join with companies table if needed, or just get company_id
                .eq('id', pid)
                .single();

            if (pError || !pData) {
                console.error('Prospect fetch error:', pError);
                // Fallback mechanism could go here, but for now we error if PID provided but not found
            } else {
                prospect = pData;
                companyId = prospect.company_id;
            }
        }

        // 2b. Fallback: Lookup Henry's if no prospect/company (Legacy Support / Direct Call)
        if (!companyId) {
            console.warn('No Company ID resolved. Falling back to key lookup or default (Henry\'s).');
            // Check if company_id provided in body
            if (body.companyId) {
                companyId = body.companyId;
            } else {
                // LAST RESORT: Look for "Henry's" to keep existing demos working
                const { data: hData } = await sb.from('companies').select('id').eq('name', 'Henry\'s').single();
                if (hData) companyId = hData.id;
            }
        }

        if (!companyId) {
            throw new Error('Could not resolve Company Context. Cannot load template.');
        }

        // 3. Load Call Template
        console.log(`Loading Template for Company ID: ${companyId}`);
        const { data: tmpl, error: tError } = await sb.from('call_templates')
            .select('*')
            .eq('company_id', companyId)
            .single();

        if (tError || !tmpl) {
            throw new Error(`No call template found for company ${companyId}.`);
        }
        template = tmpl;

        // 4. Prepare Variables for Injection
        const purchaseAmount = prospect?.purchase_amount ? Math.round(prospect.purchase_amount / 100) : 1990;
        const price2yr = prospect?.warranty_price_2yr ? Math.round(prospect.warranty_price_2yr / 100) : 199;
        const price3yr = prospect?.warranty_price_3yr ? Math.round(prospect.warranty_price_3yr / 100) : 299;
        const monthlyPrice = Math.round(price2yr / 16.5);
        const discountPrice = Math.round(price2yr * 0.90);

        const variables: Record<string, string> = {
            agent_name: body.agentName || 'Claire',
            customer_name: prospect?.first_name || body.customerName || body.firstName || 'there',
            product_name: prospect?.product || body.productName || 'your recent purchase',
            phone_number: tel,
            product_value: purchaseAmount.toString(),
            warranty_price_2yr: price2yr.toString(),
            warranty_price_3yr: price3yr.toString(),
            warranty_price_monthly: monthlyPrice.toString(),
            discount_price: discountPrice.toString(),
            link: (pid) ? (Deno.env.get('SUPABASE_URL') + '/functions/v1/track-warranty-link?prospectId=' + pid) : 'https://www.henrys.com'
        };

        // 5. Inject Variables into Prompt & First Message
        let systemPrompt = template.system_prompt;
        let firstMessage = template.first_message;

        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            systemPrompt = systemPrompt.replace(regex, value);
            firstMessage = firstMessage ? firstMessage.replace(regex, value) : "";
        }

        // 6. Resolve Phone Provider Config (Vapi Credentials)
        // Check for Custom Provider Config in 'integrations'? For now we use env vars + override logic
        const caCodes = ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'];
        let phoneId = Deno.env.get('VAPI_PHONE_NUMBER_ID');
        if (tel.startsWith('+1') && caCodes.includes(tel.substring(2, 5))) {
            const ca = Deno.env.get('VAPI_PHONE_NUMBER_ID_CA');
            if (ca) phoneId = ca;
        }

        if (!phoneId) throw new Error('Vapi Configuration Error: missing Phone Number ID');
        const privateKey = Deno.env.get('VAPI_PRIVATE_KEY');

        // 7. Build Vapi Payload
        const payload = {
            phoneNumberId: phoneId,
            customer: { number: tel, name: variables.customer_name },
            assistant: {
                model: {
                    provider: "openai",
                    model: "gpt-4o",
                    messages: [{ role: "system", content: systemPrompt }],
                    maxTokens: 350,
                    functions: [
                        // Define standard tools here. Ideally these should verify against integrations table
                        {
                            name: "sendSms",
                            description: "Send text",
                            parameters: {
                                type: "object",
                                properties: {
                                    phoneNumber: { type: "string" },
                                    message: { type: "string" }
                                },
                                required: ["phoneNumber", "message"]
                            }
                        },
                        {
                            name: "reportIssue",
                            description: "Report a customer support issue.",
                            parameters: {
                                type: "object",
                                properties: {
                                    issueType: { type: "string", enum: ["not_received", "damaged", "wrong_item", "returned", "waiting_for_delivery", "other"] },
                                    description: { type: "string" },
                                    sentiment: { type: "string" }
                                },
                                required: ["issueType", "description"]
                            }
                        },
                        {
                            name: "offerDiscount",
                            description: "Apply a special discount.",
                            parameters: {
                                type: "object",
                                properties: { newPrice: { type: "number" } },
                                required: ["newPrice"]
                            }
                        }
                    ]
                    // We could filter functions based on template.tools_config later
                },
                voice: {
                    provider: "11labs",
                    voiceId: template.voice_id || "jBzLvP03992lMFEkj2kJ", // Default Paige
                    startAt: 0,
                    model: "eleven_turbo_v2_5",
                    stability: 0.5,
                    similarityBoost: 0.75,
                },
                transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
                serverUrl: 'https://tikocqefwifjcfhgqdyj.supabase.co/functions/v1/handle-call-webhook-v2',
                firstMessageMode: "assistant-waits-for-user",
                firstMessage: firstMessage,
                backgroundSound: "off"
            },
            metadata: { prospectId: pid, companyId: companyId }
        };

        // 8. Execute Call
        console.log('Sending to Vapi:', JSON.stringify(payload.assistant.firstMessage));

        const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + privateKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!vapiRes.ok) {
            throw new Error(`Vapi API Error: ${await vapiRes.text()}`);
        }

        const vapiData = await vapiRes.json();
        console.log('Vapi Call Initiated:', vapiData.id);

        // 9. Log to DB
        if (pid) {
            await sb.rpc('increment_call_attempts', { prospect_id: pid }).catch(e => console.error('RPC Error:', e));
            await sb.from('call_logs').insert({
                warranty_prospect_id: pid,
                provider_call_id: vapiData.id,
                connection_status: 'SUCCESS',
                communication_sent: 'Initiated AI call (Generic Engine)'
            }).catch(e => console.error('Log Error:', e));
        }

        return new Response(JSON.stringify({ success: true, id: vapiData.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('Generic Engine Error:', e);
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 // Return 200 so UI can handle error gracefully
        });
    }
})
