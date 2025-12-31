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
        console.log('Incoming Request Body:', JSON.stringify(body));

        const phoneInput = (body.phone || body.phoneNumber || "").toString().trim();
        const name = body.customerName || body.firstName || 'there';
        const prod = body.productName || "your recent purchase";
        const pid = body.prospectId;

        if (!phoneInput) throw new Error('Request missing phone number');

        const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const firstName = name.split(' ')[0];

        // ULTRA-VERBOSE E.164 NORMALIZATION
        console.log(`Original phone input: "${phoneInput}" (length: ${phoneInput.length})`);

        let tel = phoneInput.replace(/[^\d+]/g, ''); // Keep only digits and +

        if (tel.startsWith('+')) {
            tel = '+' + tel.substring(1).replace(/\+/g, '');
        } else {
            // If it's 10 digits, it's almost certainly North America
            if (tel.length === 10) {
                tel = '+1' + tel;
            } else if (tel.length === 11 && tel.startsWith('1')) {
                tel = '+' + tel;
            } else {
                // Prepend + for E.164 standard, but this is a risky fallback
                tel = '+' + tel;
            }
        }

        // Final E.164 Validation (Regex based on standard)
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        if (!e164Regex.test(tel)) {
            console.error(`Validation Failed locally: "${tel}" is not valid E.164`);
            throw new Error(`Invalid phone number format. Received: ${phoneInput}, Normalized to: ${tel}. Please use +1 followed by 10 digits.`);
        }

        console.log(`Final Normalized Phone for Vapi: "${tel}" (length: ${tel.length})`);

        const link = Deno.env.get('SUPABASE_URL') + '/functions/v1/track-warranty-link?prospectId=' + pid;

        const prompt = `You are Catherine, a Henry's Warranty Expert. You're calling ${firstName} about their recent purchase of ${prod}.

        **STYLE & VIBE (CRITICAL):**
        - **Upbeat & Enthusiastic**: Be helpful, positive, and cheerful. You love helping customers protect their gear!
        - **Pace**: Casual conversational pace.
        - **Speak Confidently & Naturally**: Do not sound robotic. Be professional yet friendly. Use appropriate intonation throughout the call.
        - **Direct Professionalism**: Do NOT praise the customer's questions (e.g., Avoid "That's a great question"). Just answer them directly.
        - **Emotional Control**: Do NOT laugh, chuckle, or make any inappropriate verbal sounds (e.g., sighs, heavy breathing). Maintain professional composure.
        - **No Artificial Sounds**: Do NOT use fake keyboard clicking or simulated background office noise.
        - **Conversational Fillers**: Use "so", and "actually" naturally.

        **SCRIPT FLOW:**

        1. **The Introduction (Vibrant & Immediate):**
           - **IMPORTANT**: Wait for the customer to say a greeting (like "Hello?").
           - **After they respond, start speaking immediately. Use a calm, natural tone for the first sentence**: "Hi there! ... Is ${firstName} there?"
           - **IF Affirmative (Respond WITHOUT DELAY). Be careful not to stutter, duplicate words, or cut out words:** 
             "Hi ${firstName}! This is Catherine, calling from Henry's camera store. I'm calling to let you know about some additional protection options for your recent ${prod} purchase, while you're still in the 7-day warranty window. ... Do you have a quick minute?"
           - **IF Questioning:**
             "This is Catherine calling from Henry's camera store. I'm calling to let you know about some additional protection options for your recent ${prod} purchase while you're still in the 7-day warranty window.
             Do you have a quick minute?"

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
           - "Great, would you be open to hearing about some warranty options that can help protect your equipment?"
           - **Wait for the customer to respond and if they confirm, continue:**
           - "We have a monthly, yearly and 2-year plan. To cover your purchase of ${prod}, you'd be paying $12 a month for the monthly option, $110 for one year of protection, or $200 for two years of coverage. Most people choose the monthly payments because you can cancel anytime, or a multi-year plan if you want to lock in a discount. Does any of those sound like something you'd like to take advantage of?"
           - **If the customer asks about specific pricing**:
             "To cover your purchase of ${prod}, you'd be paying $12 a month for the monthly option, $110 for one year of protection, or $200 for two years of coverage. Most people choose the monthly payments because you can cancel anytime, or a multi-year plan if you want to lock in a discount. Does any of those sound like something you'd like to take advantage of?" 
             - **If the customer is unsure, offer to send an SMS:**
             - "I can send you a text with a link to review the details at your convenience. I can also send you a reminder a few days before the offer expires so that you don't miss out. Does that work for you?"
             - **Wait for customer to respond and send Sms**
             - Confirm reception: "I've sent that text over. Did it come through for you?"
             - **If Sms doesn't go through**, confirm that you will send a text later with all the details.
             - Finish politely: "Thanks so much for your time! Don't hesitate to call us back if you have any other questions. Bye!"

           - **3 or 4 Year Plan?**: We currently focus on our flexible monthly, 1-year, and 2-year plans to ensure the best value. For 3 or 4-year inquiries, let them know they can find our full range of extended options at henrys.com.
           - **Are you an AI?**: If asked, reply honestly that you are an AI assistant helping the Henry's team, but you're still here to help with all their warranty questions!
           - **When does coverage start?**: Coverage begins at the moment of purchase. We simply add the remaining balance of their current free warranty to the new plan so protection remains continuous.
           - **What's covered?**: 100% Parts & Labour, Anti-Lemon (replace after 3 repairs), Global Coverage, 30 Day exchange for defects, 100% Transferable, 30 Day Price Protection.
           - **Traveling outside Canada?**: Tell them our online support team helps ship the camera to a local Henry's store for repair at no cost to them.
           - **Hallucination Protocol**: If someone asks a question NOT covered above, do NOT guess. Tell them: "I don't have the answer to that question—I'll send you a link to our full policy on the Henry's website so you can find the exact answer. Does that work?"

        7. **The SMS Fallback:**
           - If they want to think about it: "I totally understand. I'll send a text with those details to the number I'm calling right now so you can review them at your convenience. And, I'll send you a reminder a few days before the offer expires so that you don't miss out. How does that sound?"
           - If the customer provides a different number, text that number instead. 
           - Use 'sendSms' with link: ${link}
           - Confirm they received the link.
           - **If Sms doesn't go through**, confirm that you will send a text later with all the details.
           - Finish the call politely thanking them for their time and inviting them to call back if they have any questions.

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
                    speed: 1.0
                },
                transcriber: {
                    provider: "deepgram",
                    model: "nova-2",
                    language: "en"
                },
                // HIGH NOISE RESISTANCE (Don't stop speaking for clicks/knocks)
                stopSpeakingPlan: {
                    numWords: 2, // Must say at least 2 words to interrupt
                    voiceSeconds: 0.5 // Must speak for half a second to interrupt
                },
                serverUrl: Deno.env.get('SUPABASE_URL') + '/functions/v1/handle-call-webhook',
                firstMessageMode: "assistant-waits-for-user"
            },
            metadata: { prospectId: pid }
        };

        console.log('Vapi Payload:', JSON.stringify({
            phoneNumberId: payload.phoneNumberId,
            customer: payload.customer,
            metadata: payload.metadata
        }));

        const vapiRes = await fetch('https://api.vapi.ai/call', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + Deno.env.get('VAPI_PRIVATE_KEY'), 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!vapiRes.ok) {
            const errTxt = await vapiRes.text();
            console.error('Vapi Error Response:', errTxt);
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
