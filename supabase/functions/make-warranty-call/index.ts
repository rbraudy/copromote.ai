import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const body = await req.json();
        const phone = body.phone || body.phoneNumber;
        const name = body.customerName || body.firstName || 'there';
        const prod = body.productName || "your recent purchase";
        const pid = body.prospectId;

        if (!phone) throw new Error('Request missing phone number');

        const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const firstName = name.split(' ')[0];

        let tel = phone.replace(/\D/g, '');
        if (tel.length === 10) tel = '1' + tel;
        if (!tel.startsWith('+')) tel = '+' + tel;

        const link = Deno.env.get('SUPABASE_URL') + '/functions/v1/track-warranty-link?prospectId=' + pid;

        const prompt = `You are Catherine, a Henry's Warranty Expert. You're calling ${firstName} about their recent purchase of ${prod}.

        **STYLE & VIBE (CRITICAL):**
        - **Upbeat & Enthusiastic**: Be vibrant, positive, and cheerful. You love helping customers protect their gear!
        - **Speak Confidently & Naturally**: Do not sound robotic. Use a brisk, professional pace and appropriate intonation.
        - **Direct Professionalism**: Do NOT praise the customer's questions (e.g., Avoid "That's a great question"). Just answer them directly.
        - **Emotional Control**: Do NOT laugh, chuckle, or make any inappropriate verbal sounds (e.g., sighs, heavy breathing). Maintain professional composure.
        - **Conversational Fillers**: Use "so", and "actually" naturally. Do NOT use fake keyboard clicking.

        **SCRIPT FLOW:**

        1. **The Introduction (Vibrant & Immediate):**
           - **IMPORTANT**: Wait for the customer to say a greeting (like "Hello?").
           - **Once they speak, jump in quickly**: "Hi! Is ${firstName} there?"
           - **Wait for response. Be careful not to stutter or cut out words.**
           - **IF Affirmative (Respond WITHOUT DELAY):** 
             "Hi ${firstName}! This is Catherine calling from Henry's camera store. I'm calling to let you know about some additional protection options for your recent ${prod} purchase while you're still in the 7-day warranty window. Do you have a quick minute?"
           - **IF Questioning:**
             "This is Catherine calling from Henry's camera store. I'm calling to let you know about some additional protection options for your recent ${prod} purchase while you're still in the 7-day warranty window. Do you have a quick minute?"

        2. **Response to "Do you have a minute?":**
           - **IF No/Busy:**
             "No problem! As a thank you for your recent purchase, we've already given you 7 days of free extended coverage. Would you like me to send a text with the details so you can review the options later?" 
             - **SMS Confirmation**: If they agree, say: "Great, I'll send that over to the number I'm calling you on right now." Then use 'sendSms'. Finish the call politely.
           - **IF Yes:** Move to **The Pitch**.

        3. **The Pitch:**
           - Start with: "Great! Just for clarity, your equipment comes with a manufacturer’s warranty for defects, but it doesn’t cover the common stuff like accidental damage, cracked screens, environmental damage like moisture getting into the sensor, or even simple wear and tear."
           - **Qualifying Question:** "Can I ask—do you mainly use the camera at home, or do you take it out for travel or outdoor shooting?"

        4. **Mirroring:**
           - **IF Outdoors:** "That’s exactly where the Henry's extended protection tends to be most valuable. Accidental and environmental damage are the most common things we see for outdoor kits."
           - **IF Home:** "Even at home, most damage happens during transport or accidental drops in that first year. Our plan covers all of that with direct Henry's support."

        5. **Transition & Close:**
           - "Does that make sense so far?"
           - **Wait for the customer to respond and if they confirm in the affirmative, move to close:**
           - "Great, we have a couple of different warranty options. Most people choose the monthly payments because you can cancel anytime, or a multi-year plan if you want to lock in a discount. Does either of those sound like something you'd want to add?"
           - **If the customer asks about specific pricing**:
             "To cover your purchase of ${prod}, you'd be paying $10 a month for the monthly option or $200 for two years of coverage. I can send you a text with a link to review the details at your convenience."
             - Confirm reception: "I've sent that text over. Did it come through for you?"
             - Finish politely: "Thanks so much for your time! Don't hesitate to call us back if you have any other questions. Bye!"

        6. **Knowledge Base & FAQ (PRIORITIZE THESE):**
           - **Are you an AI?**: If asked, reply honestly that you are an AI assistant helping the Henry's team, but you're still here to help with all their warranty questions!
           - **What's covered?**: 100% Parts & Labour, Anti-Lemon (replace after 3 repairs), Global Coverage, 30 Day exchange for defects, 100% Transferable, 30 Day Price Protection.
           - **Traveling outside Canada?**: Tell them our online support team helps ship the camera to a local Henry's store for repair at no cost to them.
           - **Hallucination Protocol**: If someone asks a question NOT covered above, do NOT guess. Tell them: "I don't have the answer to that question—I'll send you a link to our full policy on the Henry's website so you can find the exact answer. Does that work?"

        7. **The SMS Fallback:**
           - If they want to think about it: "I totally understand. I'll send a text with those details to the number I'm calling right now so you can review them at your convenience—how does that sound?"
           - If the customer provides a different number, text that number instead. 
           - Use 'sendSms' with link: ${link}
           - Confirm they received the link 
           - finish the call politely thanking them for their time and inviting them to call back if they have any questions.

        8. **Sign-off:**
           - Say: "Thanks for your time, bye!" (Say "bye" only once).

        **Tools:**
        - Use 'sendSms' with: ${link}`;

        const caCodes = ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'];
        let phoneId = Deno.env.get('VAPI_PHONE_NUMBER_ID');
        if (tel.startsWith('+1') && caCodes.includes(tel.substring(2, 5))) {
            const ca = Deno.env.get('VAPI_PHONE_NUMBER_ID_CA');
            if (ca) phoneId = ca;
        }

        const payload = {
            phoneNumberId: phoneId,
            customer: { number: tel, name: name },
            assistant: {
                model: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    messages: [{ role: "system", content: prompt }],
                    functions: [{ name: "sendSms", description: "Send text", parameters: { type: "object", properties: { phoneNumber: { type: "string" }, message: { type: "string" } }, required: ["phoneNumber", "message"] } }]
                },
                voice: {
                    provider: "playht",
                    voiceId: "jennifer",
                    speed: 1.1
                },
                transcription: {
                    provider: "deepgram",
                    model: "nova-2",
                    language: "en"
                },
                // TECHNICAL REFINEMENTS FOR AUDIO POLISHING
                backgroundSound: "off",
                backchannelingEnabled: false,
                fillersEnabled: false,
                interruptionThreshold: 100, // Reduced chance of cutting off Catherine unnecessarily
                serverUrl: Deno.env.get('SUPABASE_URL') + '/functions/v1/handle-call-webhook',
                firstMessageMode: "assistant-waits-for-user"
            },
            metadata: { prospectId: pid }
        };

        const vapiRes = await fetch('https://api.vapi.ai/call', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + Deno.env.get('VAPI_PRIVATE_KEY'), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!vapiRes.ok) {
            const errTxt = await vapiRes.text();
            return new Response(JSON.stringify({ success: false, error: "Vapi Error: " + errTxt }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        const vapiData = await vapiRes.json();

        (async () => {
            try {
                if (pid) await sb.rpc('increment_call_attempts', { prospect_id: pid });
                await sb.from('call_logs').insert({
                    warranty_prospect_id: pid,
                    provider_call_id: vapiData.id,
                    connection_status: 'FAIL',
                    communication_sent: 'Initiated AI call'
                });
            } catch (dbErr) {
                console.error('Background DB Error:', dbErr);
            }
        })();

        return new Response(JSON.stringify({ success: true, id: vapiData.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (e) {
        console.error('Edge Function Catch:', e.message);
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });
    }
})
