import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { VAPI_TECHNICAL_GUARDRAILS } from "../_shared/vapi-guardrails.ts"

const P = `
# IDENTITY
You are the **Script Architect** for CoPromote.ai. You are a master of Consultative Sales and the "Henry's Camera Gold Standard" methodology. Your purpose is to guide owners through engineering high-performing protection plan scripts.

# MISSION
Lead with the fact that you've already generated a baseline script. Collaborate to refine it. Proactively suggest the "Consultative Approach" as best practice.

# CONSULTATIVE DNA (Your Advisory Knowledge)
1. **Assumptive Transitions**: Use "Cost-of-Inaction" logic. Don't ask if they want protection; assume they want the peace of mind.
2. **The "Concierge" Persona**: Start as customer service (Quality Check). "Did your order arrive? How is it performing?" Building trust before the pitch.
3. **The A.P.C. Method**: (Acknowledge, Pivot, Confirm). Never ignore objections.
4. **The Price Sandwich**: Mention value -> Price -> Risk Reversal (30-day cancellation).
5. **Vibe**: "Caffeinated Professional". 70% Upbeat, warm but authoritative. Use "Smile" technique.
6. **Guardrails**: No politics/religion/profanity. Pivot back to warranty if distracted. If customers use profanity, politely terminate.

# ROLEPLAY RULES
When roleplaying, act as a Henry's Camera Store Concierge. Use natural fillers ("Honestly", "Actually"), micro-pauses for impact, and downward inflections on value statements.

# GREETING (STRICT START)
"Hi I'm {{agent_name}}, thanks for selecting me to help sell your product warranties. I've gone ahead and created a script that we can collaborate on so that you get the best results from your sales campaign. Would you like to hear how the script sounds? You can stop me anytime and make adjustments on the fly and I'll update the script based on your preferences."
`;

const M = "Hi I'm {{agent_name}}, thanks for selecting me to help sell your product warranties. I've gone ahead and created a script that we can collaborate on so that you get the best results from your sales campaign. Would you like to hear how the script sounds? You can stop me anytime and make adjustments on the fly and I'll update the script based on your preferences.";

const H = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: H });
    try {
        const { phone, companyId } = await req.json();
        const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        const { data: config } = await sb.from('campaign_configs')
            .select('*, companies(name)')
            .eq('company_id', companyId)
            .single();

        if (!config) throw new Error('Configuration context missing.');

        let kb = "";
        if (config.knowledge_base && Array.isArray(config.knowledge_base)) {
            // Process up to 5 documents to avoid payload bloat
            for (const doc of config.knowledge_base.slice(0, 5)) {
                if (doc.type === 'text/plain' || doc.name.endsWith('.txt')) {
                    try {
                        const res = await fetch(doc.url);
                        if (res.ok) kb += `\n--- DOC: ${doc.name} ---\n${(await res.text()).substring(0, 4000)}\n`;
                    } catch (e) {
                        console.error(`KB Error: ${doc.name}`, e);
                    }
                }
            }
        }

        const pricing = config.program_profile?.model === 'tiered'
            ? config.program_profile.tiers.map((t: any) => `${t.name}: ${t.price}`).join(', ')
            : `Flat Rate: ${config.program_profile?.flat_rate || 'Not set'}`;

        const vars: any = {
            agent_name: 'Claire',
            product_category: config.product_info?.name || 'General Protection',
            company_name: config.companies?.name || 'Your Company',
            pricing_summary: pricing,
            kb_summary: kb || config.refinement_notes || 'No specific scripts or notes uploaded yet.'
        };

        let sys = P, msg = M;
        console.log(`[DEBUG] Architect Substitution - Context: ${companyId}`);

        // Standard Substitution (Case-Insensitive Fail-safe)
        Object.entries(vars).forEach(([k, v]: [string, any]) => {
            const r = new RegExp(`{{${k}}}`, 'gi');
            const safeVal = String(v || "");
            sys = sys.replace(r, safeVal);
            msg = msg.replace(r, safeVal);
        });

        console.log(`[DEBUG] Final Architect Variables:`, JSON.stringify(vars));

        // NEGATIVE BRAND FILTER (Anti-Billy Fail-safe)
        let safeCompanyName = vars.company_name;
        const matchesBilly = (name: string) => /Billy['’]s\s*Printers/gi.test(name);
        if (matchesBilly(safeCompanyName)) {
            console.log(`[SECURITY] Detected legacy "Billy" branding in Architect data. Forcing fallback.`);
            safeCompanyName = "Henry's"; // Safe fallback
        }

        // SMART BRAND PURGE (Fail-safe for legacy strings)
        const brandRegex = /Billy['’']s\s*Printers/gi;
        sys = sys.replace(brandRegex, safeCompanyName);
        msg = msg.replace(brandRegex, safeCompanyName);

        // Canadian Number Logic
        const caCodes = ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'];
        const tel = phone.replace(/[^\d+]/g, '');
        const normalizedTel = tel.startsWith('+') ? tel : (tel.length === 10 ? `+1${tel}` : `+${tel}`);

        let phoneId = Deno.env.get('VAPI_PHONE_NUMBER_ID');
        if (normalizedTel.startsWith('+1') && caCodes.includes(normalizedTel.substring(2, 5))) {
            const ca = Deno.env.get('VAPI_PHONE_NUMBER_ID_CA');
            if (ca) phoneId = ca;
        }

        const payload = {
            phoneNumberId: phoneId,
            customer: { number: normalizedTel },
            assistant: {
                model: {
                    provider: "openai", // Reverted for stability
                    model: "gpt-4o-mini",
                    messages: [{ role: "system", content: `${VAPI_TECHNICAL_GUARDRAILS}\n\n${sys}` }],
                    temperature: 0.7
                },
                transcriber: {
                    provider: "deepgram",
                    model: "nova-2",
                    language: "en"
                },
                voice: {
                    provider: "vapi",
                    voiceId: "Emma", // Upbeat & Professional
                    speed: 1.0
                },
                functions: [
                    { name: "updateTactic", description: "Enable tactic", parameters: { type: "object", properties: { tacticName: { type: "string" }, enabled: { type: "boolean" } }, required: ["tacticName", "enabled"] } },
                    { name: "updateGuardrail", description: "Add guardrail", parameters: { type: "object", properties: { description: { type: "string" } }, required: ["description"] } },
                    { name: "buildFinalScript", description: "Generate final script", parameters: { type: "object", properties: {} } },
                    { name: "sendSms", description: "Send sample SMS", parameters: { type: "object", properties: { message: { type: "string" } }, required: ["message"] } }
                ],
                serverUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-call-webhook-v2`,
                firstMessageMode: "assistant-waits-for-user",
                firstMessage: msg,
                backgroundSound: "off",
                fillersEnabled: true,
                backchannelingEnabled: true,
                silenceTimeoutSeconds: 15,
                analysisPlan: {
                    summaryPlan: { enabled: false },
                    successEvaluationPlan: { enabled: false },
                    structuredDataPlan: { enabled: false }
                }
            },
            metadata: { companyId, type: 'architect_setup' }
        };

        let res;
        try {
            res = await fetch('https://api.vapi.ai/call/phone', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${Deno.env.get('VAPI_PRIVATE_KEY')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`[VAPI_ERROR] Status: ${res.status} | Body: ${errText}`);
                await logDebug(sb, 'make-architect-call', 'Vapi_API_Error', { status: res.status, phoneId, phone }, errText);
                throw new Error(`Vapi Error: ${errText}`);
            }
        } catch (e: any) {
            await logDebug(sb, 'make-architect-call', 'Fetch_Failure', payload, undefined, e);
            throw e;
        }
        return new Response(JSON.stringify(await res.json()), { headers: { ...H, 'Content-Type': 'application/json' } });
    } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { ...H, 'Content-Type': 'application/json' } });
    }
});
