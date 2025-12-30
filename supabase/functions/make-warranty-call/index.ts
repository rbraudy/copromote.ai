import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        console.log('Received request body:', JSON.stringify(body));

        const phone = body.phone || body.phoneNumber;
        const customerName = body.customerName || body.firstName;
        const productName = body.productName;
        const purchaseDate = body.purchaseDate;
        const prospectId = body.prospectId;

        if (!phone) {
            throw new Error('Missing phone number (passed as phone or phoneNumber)');
        }

        // Calculate Expiry Date (7 days from purchase)
        const pDate = purchaseDate ? new Date(purchaseDate) : new Date();
        const expiryDate = new Date(pDate.getTime() + (7 * 24 * 60 * 60 * 1000));
        const expiryDateString = expiryDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const purchaseDateString = pDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        // 1. Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceKey);

        // 2. Sanitize phone number
        let sanitizedPhone = phone.replace(/[^\d+]/g, '');
        if (!sanitizedPhone.startsWith('+')) {
            if (sanitizedPhone.length === 10) sanitizedPhone = `+1${sanitizedPhone}`;
            else sanitizedPhone = `+${sanitizedPhone}`;
        }

        // 3. Extract First Name for greeting
        const firstName = customerName ? customerName.split(' ')[0] : 'there';
        const productFriendly = productName || 'your recent purchase';

        // 4. Construct the AI System Prompt
        const trackingLink = `${supabaseUrl}/functions/v1/track-warranty-link?prospectId=${prospectId}`;

        const systemPrompt = `
        You are Catherine, a Henry's Warranty Expert. You are calling ${firstName} regarding their recent purchase of ${productFriendly}.

        **Style & Tone:**
        - **Professional but Natural**: Speak like a helpful store associate. Use contractions (it's, you're).
        - **Listening First**: Wait for the customer to finish speaking.
        - **Empathetic**: Acknowledge their usage patterns.

        **Script Flow & Logic:**

        1. **Initial Verification (The "Is Robert there?" phase):**
           - **IMPORTANT**: Wait for the customer to say something first (like "Hello?").
           - Once they speak, you start with: "Hi, is ${firstName} there?"
           - **Wait for response.**
           - **IF Affirmative** (e.g., "This is", "Speaking", "Yes"): 
             "Hi ${firstName}, This is Catherine calling from Henry's camera store and I wanted to make sure you’re aware of the protection options available for your ${productFriendly} while you're still within the 7 days eligibility window. Do you have a quick minute?"
           - **IF Questioning** (e.g., "Who's this?", "Who's calling?"):
             "This is Catherine calling from Henry's camera store and I wanted to make sure you’re aware of the protection options available for your ${productFriendly} while you're still within the 7 days eligibility window. Do you have a quick minute?" 

        2. **Handling Response to "Do you have a quick minute?":**
           - **IF "No thanks" or "Not a good time":**
             "No problem at all. You have 7 days to take advantage of this offer. In the meantime, we're giving you the extended warranty for free during this window. Can I send you an email or text with the details so you can review them at your convenience?"
             - If they agree: Confirm contact info and use 'sendSms'. Let them know the information has been sent and the offer is only valid for 7 days.
           - **IF Affirmative (e.g., "Yes", "Sure", "Go ahead"):** 
             Move directly to **The Pitch**.

        3. **The Pitch:**
           - Start with: "Great, Just for clarity, the manufacturer’s warranty covers defects in workmanship or parts—basically, issues from the factory. What it doesn’t cover are the things that tend to happen during normal use - That includes accidental damage like cracked screens, sensor issues that develop over time, and environmental damage—things like dust, sand, or moisture getting into the camera."
           - **Ask the Qualifying Question:** "Can I ask—do you mainly use the camera at home, or do you take it out for travel, events, or outdoor shooting?"

        4. **Mirroring & Tailoring:**
           - **Wait for their answer.**
           - **IF Outdoors/Travel:** “That’s exactly where the Henry's extended protection tends to be most valuable, since accidental and environmental damage are the most common claims we see.”
           - **IF Casual/Home:** “Even with casual use, most accidental damage happens in the first year—especially during transport. Our protection plan simply extends your coverage to include accidental damage, wear and tear, and mechanical or sensor failures, with repairs handled directly through Henry’s.”

        5. **Objection Handling:**
           - **Auto-Renewal / Charge Questions:** If the customer asks if it auto-renews or if they have to cancel, say: "That's a great question. Your protection automatically expires after the term, so you will not be automatically charged. There's no need to worry about cancelling."
           - **Rude Customers / Expletives:** If the customer is rude or uses expletives, remain professional and empathetic: "I understand. I'm just calling to make sure you're aware of your options. Would you rather I just text the information to you instead of us talking now?"

        6. **The Close:**
           - "Most customers choose either a monthly option to keep it flexible where they cancel anytime, or a multi-year plan that locks in savings. Would you like to add that coverage while it’s still available?"
           
        7. **Handling the Conclusion:**
           - **IF Yes or "I'll think about it" / "Send me info":**
             "I can send you a link where you can see the specific details and take advantage of the offer. Shall I send that to your phone or email?"
             - Confirm details, confirm the link has been sent, and remind them it's only valid for 7 days.

        **Tracking Link (CRITICAL):**
        When the customer agrees to receive a link via SMS, use the 'sendSms' tool with a message that includes this exact URL: ${trackingLink}
        
        **Tool Usage:**
        - Use 'sendSms' to send the link when requested.
        `;

        // 5. Setup Vapi Secrets
        const vapiPrivateKey = Deno.env.get('VAPI_PRIVATE_KEY')!;
        const vapiPhoneNumberId = Deno.env.get('VAPI_PHONE_NUMBER_ID');

        if (!vapiPhoneNumberId) {
            throw new Error('VAPI_PHONE_NUMBER_ID is not set in Supabase secrets');
        }

        // 6. Dynamic Caller ID Routing
        let selectedPhoneNumberId = vapiPhoneNumberId;
        const canadianAreaCodes = [
            '204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438',
            '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709',
            '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'
        ];

        if (sanitizedPhone.startsWith('+1')) {
            const areaCode = sanitizedPhone.substring(2, 5);
            if (canadianAreaCodes.includes(areaCode)) {
                const caPhoneId = Deno.env.get('VAPI_PHONE_NUMBER_ID_CA');
                if (caPhoneId) {
                    console.log(`Detected Canadian number (${areaCode}), using CA Caller ID: ${caPhoneId.substring(0, 5)}...`);
                    selectedPhoneNumberId = caPhoneId;
                }
            }
        }

        const callBody = {
            phoneNumberId: selectedPhoneNumberId,
            customer: {
                number: sanitizedPhone,
                name: customerName || 'Valued Customer'
            },
            assistant: {
                model: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        }
                    ],
                    functions: [
                        {
                            name: "sendSms",
                            description: "Send a text message with the warranty details to the customer.",
                            parameters: {
                                type: "object",
                                properties: {
                                    phoneNumber: {
                                        type: "string",
                                        description: "The customer's phone number to text."
                                    },
                                    message: {
                                        type: "string",
                                        description: "The message content to send."
                                    }
                                },
                                required: ["phoneNumber", "message"]
                            }
                        }
                    ]
                },
                transcriber: {
                    provider: "deepgram",
                    model: "nova-2",
                    language: "en"
                },
                voice: "jennifer-playht",
                serverUrl: Deno.env.get('SUPABASE_URL') + '/functions/v1/handle-call-webhook',
                endOfUtteranceTimeout: 1200,
                interruptible: true
            }
        };

        console.log('Initiating Vapi call with body:', JSON.stringify(callBody));

        const vapiResponse = await fetch('https://api.vapi.ai/call', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vapiPrivateKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(callBody)
        });

        if (!vapiResponse.ok) {
            const errText = await vapiResponse.text();
            console.error('Vapi API Error:', errText);
            throw new Error(`Vapi API Error: ${vapiResponse.status} ${errText}`);
        }

        const vapiData = await vapiResponse.json();
        console.log('Vapi Call Initiated:', vapiData.id);

        // 7. Increment Call Attempts
        if (prospectId) {
            await supabase.rpc('increment_call_attempts', { prospect_id: prospectId });
        }

        // 8. Log to Database
        const { error: logError } = await supabase
            .from('call_logs')
            .insert({
                warranty_prospect_id: prospectId,
                provider_call_id: vapiData.id,
                status: 'queued',
                connection_status: 'FAIL', // Default until connection is successful
                communication_sent: `Initiated call regarding ${productFriendly}`
            });

        if (logError) console.error('Error logging call:', logError);

        return new Response(
            JSON.stringify({ success: true, callId: vapiData.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Error making warranty call:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }
});
