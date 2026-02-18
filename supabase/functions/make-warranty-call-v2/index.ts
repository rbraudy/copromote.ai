import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
}

const TEST_CALL_LIMIT = 20;
const SUPERADMIN_EMAIL = 'rbraudy@gmail.com';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        // 0. Auth Check
        const authHeader = req.headers.get('Authorization');
        let userEmail = '';
        if (authHeader) {
            const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
                global: { headers: { Authorization: authHeader } }
            });
            const { data: { user } } = await client.auth.getUser();
            userEmail = user?.email || '';
        }

        const phoneInput = (body.phone || body.phoneNumber || "").toString().trim();
        const pid = body.prospectId;

        if (!phoneInput) throw new Error('Request missing phone number');

        // 1. Phone Number Normalization
        let tel = phoneInput.replace(/[^\d+]/g, '');
        if (tel.startsWith('+')) {
            tel = '+' + tel.substring(1).replace(/\+/g, '');
        } else {
            tel = '+' + (tel.length === 10 ? '1' : '') + tel;
        }

        // 2. Fetch Context
        let companyId = body.companyId;
        if (pid) {
            const { data: pData } = await sb.from('warranty_prospects').select('company_id').eq('id', pid).single();
            if (pData) companyId = pData.company_id;
        }

        if (!companyId) {
            const { data: hData } = await sb.from('companies').select('id').eq('name', 'Henry\'s').single();
            companyId = hData?.id;
        }

        if (!companyId) throw new Error('Could not resolve Company Context.');

        // 3. ENFORCE TEST LIMITS
        const { data: config } = await sb.from('campaign_configs').select('*').eq('company_id', companyId).single();
        const isSuperAdmin = userEmail === SUPERADMIN_EMAIL;

        if (config && !config.is_live && !isSuperAdmin) {
            if (config.test_calls_count >= TEST_CALL_LIMIT) {
                throw new Error(`Test call limit reached (${TEST_CALL_LIMIT}). Please contact support to go live.`);
            }
        }

        // 4. Load Call Template
        const { data: template, error: tError } = await sb.from('call_templates').select('*').eq('company_id', companyId).single();
        if (tError || !template) throw new Error(`No call template found for company ${companyId}.`);

        // 5. Prepare Variables
        const { data: prospect } = pid ? await sb.from('warranty_prospects').select('*, customer_first_name').eq('id', pid).single() : { data: null };

        const purchaseAmount = prospect?.purchase_amount ? Math.round(prospect.purchase_amount / 100) : 1990;
        const price2yr = prospect?.warranty_price_2yr ? Math.round(prospect.warranty_price_2yr / 100) : 199;
        const price3yr = prospect?.warranty_price_3yr ? Math.round(prospect.warranty_price_3yr / 100) : 299;
        const monthlyPrice = Math.round(price2yr / 16.5);
        const discountPrice = Math.round(price2yr * 0.90);

        const variables: Record<string, string> = {
            agent_name: body.agentName || 'Claire',
            customer_name: prospect?.customer_first_name || prospect?.customer_name?.split(' ')[0] || body.customerName?.split(' ')[0] || 'there',
            full_customer_name: prospect?.customer_name || body.customerName || 'there',
            product_name: prospect?.product_name || body.productName || 'your recent purchase',
            phone_number: tel,
            product_value: purchaseAmount.toString(),
            warranty_price_2yr: price2yr.toString(),
            warranty_price_3yr: price3yr.toString(),
            warranty_price_monthly: monthlyPrice.toString(),
            discount_price: discountPrice.toString(),
            link: pid ? `${Deno.env.get('SUPABASE_URL')}/functions/v1/track-warranty-link?prospectId=${pid}` : 'https://www.henrys.com'
        };

        let systemPrompt = template.system_prompt;
        let firstMessage = template.first_message || "Hi, is {{customer_name}} there?";

        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            systemPrompt = systemPrompt.replace(regex, value);
            firstMessage = firstMessage.replace(regex, value);
        }

        // 6. Vapi Config
        const caCodes = ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'];
        let phoneId = Deno.env.get('VAPI_PHONE_NUMBER_ID');
        if (tel.startsWith('+1') && caCodes.includes(tel.substring(2, 5))) {
            const ca = Deno.env.get('VAPI_PHONE_NUMBER_ID_CA');
            if (ca) phoneId = ca;
        }

        const payload = {
            phoneNumberId: phoneId,
            customer: { number: tel, name: variables.customer_name },
            assistant: {
                model: {
                    provider: "openai",
                    model: "gpt-4o",
                    messages: [{ role: "system", content: systemPrompt }],
                    temperature: 0.1,
                    functions: [
                        { name: "sendSms", description: "Send text", parameters: { type: "object", properties: { phoneNumber: { type: "string" }, message: { type: "string" } }, required: ["phoneNumber", "message"] } },
                        { name: "reportIssue", description: "Report issue", parameters: { type: "object", properties: { issueType: { type: "string", enum: ["not_received", "damaged", "wrong_item", "returned", "waiting_for_delivery", "other"] }, description: { type: "string" } }, required: ["issueType", "description"] } }
                    ]
                },
                voice: {
                    provider: "11labs",
                    voiceId: template.voice_id || "jBzLvP03992lMFEkj2kJ",
                    model: "eleven_turbo_v2_5",
                    stability: 0.35,
                    similarityBoost: 0.65,
                    style: 0.45,
                    speed: 1.0
                },
                transcriber: {
                    provider: "deepgram",
                    model: "nova-2",
                    language: "en",
                    endpointing: 200
                },
                serverUrl: 'https://tikocqefwifjcfhgqdyj.supabase.co/functions/v1/handle-call-webhook-v2',
                firstMessageMode: "assistant-waits-for-user",
                firstMessage: firstMessage,
                backgroundSound: "off"
            },
            metadata: { prospectId: pid, companyId: companyId }
        };

        // 7. Execute Call
        const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${Deno.env.get('VAPI_PRIVATE_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!vapiRes.ok) throw new Error(`Vapi Error: ${await vapiRes.text()}`);
        const vapiData = await vapiRes.json();

        // 8. Increment Counter & Log
        if (!isSuperAdmin) {
            await sb.from('campaign_configs').update({ test_calls_count: (config?.test_calls_count || 0) + 1 }).eq('company_id', companyId);
        }

        if (pid) {
            await sb.rpc('increment_call_attempts', { prospect_id: pid });
            await sb.from('call_logs').insert({
                warranty_prospect_id: pid,
                provider_call_id: vapiData.id,
                connection_status: 'SUCCESS',
                communication_sent: 'Initiated Level 3 AI Call'
            });
        }

        return new Response(JSON.stringify({ success: true, id: vapiData.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (e: any) {
        console.error('Error:', e);
        return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
})

