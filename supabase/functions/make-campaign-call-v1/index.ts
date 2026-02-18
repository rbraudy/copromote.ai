// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const body = await req.json();
        // @ts-ignore
        const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        // 1. Resolve Inputs (Support both Prospect ID and Manual Test Data)
        const { prospectId, companyId: forcedCompanyId, testData, configOverrides } = body;

        let companyId = forcedCompanyId;
        if (prospectId && !companyId) {
            const { data: p } = await sb.from('warranty_prospects').select('company_id').eq('id', prospectId).single();
            if (p) companyId = p.company_id;
        }

        if (!companyId) throw new Error('Company context not found');

        // 2. Load Configuration (Use overrides if provided for testing)
        let config: any = configOverrides;
        if (!config) {
            const { data: dbConfig } = await sb.from('campaign_configs').select('*').eq('company_id', companyId).single();
            config = dbConfig;
        }

        if (!config) throw new Error('Campaign configuration not found');

        // 3. Prepare Call Data
        let firstName = 'there';
        let phone = '';
        let productName = 'your purchase';
        let purchaseAmount = 0;

        if (testData) {
            // MANUAL TEST MODE
            firstName = testData.firstName || 'there';
            phone = testData.phone;
            productName = testData.product || 'your purchase';
            purchaseAmount = (testData.productPrice || 0);
        } else if (prospectId) {
            // LIVE PROSPECT MODE
            const { data: prospect } = await sb.from('warranty_prospects').select('*').eq('id', prospectId).single();
            if (prospect) {
                firstName = prospect.customer_first_name || 'there';
                phone = prospect.customer_phone;
                productName = prospect.product_name || 'your purchase';
                purchaseAmount = (prospect.purchase_amount || 0) / 100;
            }
        }

        if (!phone) throw new Error('No phone number provided for call.');

        // Normalize Phone
        let tel = phone.replace(/[^\d+]/g, '');
        if (!tel.startsWith('+')) tel = (tel.length === 10) ? '+1' + tel : '+' + tel;

        // 4. Calculate Pricing
        const profile = config.program_profile;
        let price1yr = 0, price2yr = 0, price3yr = 0;

        const model = profile.model;
        const rules = profile.rules || {};

        if (model === 'dynamic') {
            const pct = (rules.percentage || 15) / 100;
            price2yr = Math.round(purchaseAmount * pct);
            price1yr = Math.round(price2yr * 0.7);
            price3yr = Math.round(price2yr * 1.4);
        } else if (model === 'static') {
            price2yr = rules.price2yr || rules.flatRate || 199;
            price1yr = rules.price1yr || Math.round(price2yr * 0.7);
            price3yr = rules.price3yr || Math.round(price2yr * 1.4);
        } else if (model === 'tiered') {
            const brackets = rules.brackets || [];
            const bracket = brackets.find((b: any) => purchaseAmount >= b.min && purchaseAmount <= b.max) || brackets[0] || { price: 199 };
            price2yr = bracket.price || 199;
            // Support explicit overrides in brackets if they exist
            price1yr = bracket.prices?.['1YR'] || Math.round(price2yr * 0.7);
            price3yr = bracket.prices?.['3YR'] || Math.round(price2yr * 1.4);
        } else if (model === 'individual' && rules.mapping) {
            // For individual, usually we'd pluck from prospect columns based on mapping, 
            // but for simple testing we fallback to static if not available
            price2yr = 199;
            price1yr = 149;
            price3yr = 249;
        }

        const discountPrice = profile.hidden_discount_enabled ? Math.round(price2yr * 0.85) : price2yr;

        // 5. Construct Prompt
        const { data: template } = await sb.from('call_templates').select('system_prompt').eq('company_id', companyId).single();
        // Use drafted raw script if available in overrides, else DB template
        let systemPrompt = (configOverrides && config.system_prompt_override) || template?.system_prompt || "You are a sales agent.";

        const variables = {
            customer_name: firstName,
            product_name: productName,
            product_value: purchaseAmount.toFixed(2),
            warranty_price_1yr: price1yr.toString(),
            warranty_price_2yr: price2yr.toString(),
            warranty_price_3yr: price3yr.toString(),
            discount_price: discountPrice.toString(),
            agent_name: config.agent_behavior?.agent_name || 'Claire'
        };

        Object.entries(variables).forEach(([key, val]) => {
            systemPrompt = systemPrompt.replace(new RegExp(`{{${key}}}`, 'g'), val);
        });

        // 6. Initiate Call via Vapi
        // Canadian Number Logic
        // Canadian Number Logic
        const caCodes = ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'];
        // @ts-ignore
        let phoneId = Deno.env.get('VAPI_PHONE_NUMBER_ID');

        if (tel.startsWith('+1') && caCodes.includes(tel.substring(2, 5))) {
            // @ts-ignore
            const ca = Deno.env.get('VAPI_PHONE_NUMBER_ID_CA');
            if (ca) {
                console.log('Detected Canadian Number. Using CA Phone ID.');
                phoneId = ca;
            } else {
                console.warn('Canadian number detected but VAPI_PHONE_NUMBER_ID_CA is missing. Falling back to default US ID.');
            }
        }

        // @ts-ignore
        const privateKey = Deno.env.get('VAPI_PRIVATE_KEY');

        if (!phoneId || !privateKey) throw new Error('Missing Vapi Configuration (Secrets)');

        const payload = {
            phoneNumberId: phoneId,
            customer: { number: tel, name: firstName },
            assistant: {
                model: {
                    provider: "openai",
                    model: "gpt-4",
                    messages: [{ role: "system", content: systemPrompt }],
                    maxTokens: 200, // Optimize latency
                    functions: [
                        { name: "sendSms", description: "Send text", parameters: { type: "object", properties: { phoneNumber: { type: "string" }, message: { type: "string" } }, required: ["phoneNumber", "message"] } },
                        { name: "reportIssue", description: "Report issue", parameters: { type: "object", properties: { issueType: { type: "string", enum: ["not_received", "damaged", "wrong_item", "returned", "waiting_for_delivery", "other"] }, description: { type: "string" } }, required: ["issueType", "description"] } }
                    ]
                },
                voice: {
                    provider: "11labs",
                    voiceId: config.agent_behavior?.voice_id === 'josh' ? "soYjpn8hCmarWqRjtvMN" : (config.agent_behavior?.voice_id === 'paige' ? "jBzLvP03992lMFEkj2kJ" : "EXAVITQu4vr4xnSDxMaL"),
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
                firstMessageMode: "assistant-waits-for-user",
                firstMessage: `Hi, is this ${firstName}?`,
                backgroundSound: "off",
                // Use a dedicated webhook for campaign calls to avoid polluting warranty logic
                // Add timestamp to prevent caching issues
                serverUrl: `https://tikocqefwifjcfhgqdyj.supabase.co/functions/v1/handle-campaign-webhook?t=${Date.now()}`
            }
        };

        console.log('Initiating Call to:', tel);

        const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + privateKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!vapiRes.ok) {
            const err = await vapiRes.text();
            throw new Error(`Vapi API Error: ${err}`);
        }

        const vapiData = await vapiRes.json();

        return new Response(JSON.stringify({
            success: true,
            callId: vapiData.id,
            debug: { tel, price2yr, productName }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 // Return 200 even on error so client can read the message without CORS block
        });
    }
});
