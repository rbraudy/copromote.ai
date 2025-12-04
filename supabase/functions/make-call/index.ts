import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { leadId, proposalId, shareUrl } = await req.json()

        if (!leadId || !proposalId) {
            throw new Error('Missing leadId or proposalId')
        }

        // ... (Supabase init and fetching logic remains same) ...



        // 1. Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, serviceKey)

        // 2. Fetch Lead and Proposal Details
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) throw new Error('Lead not found')

        const { data: proposal, error: proposalError } = await supabase
            .from('copromotions')
            .select('*, offer_details')
            .eq('id', proposalId)
            .single()

        if (proposalError || !proposal) throw new Error('Proposal not found')

        if (!lead.phone) throw new Error('Lead has no phone number')

        // 3. Sanitize phone number (remove spaces, dashes, parentheses)
        let sanitizedPhone = lead.phone.replace(/[^\d+]/g, '')

        // Ensure E.164 format
        if (!sanitizedPhone.startsWith('+')) {
            // If 10 digits, assume US/CA and add +1
            if (sanitizedPhone.length === 10) {
                sanitizedPhone = `+1${sanitizedPhone}`
            }
            // If 11 digits and starts with 1, just add +
            else if (sanitizedPhone.length === 11 && sanitizedPhone.startsWith('1')) {
                sanitizedPhone = `+${sanitizedPhone}`
            }
            // Otherwise, assume it's a valid number missing the plus
            else {
                sanitizedPhone = `+${sanitizedPhone}`
            }
        }

        // 4. Construct the AI System Prompt
        const systemPrompt = `
        You are Catherine, Portstyle's AI Sales Agent. You are calling ${lead.first_name || 'a partner'} at ${lead.company_name || 'their store'}.

        **Style & Tone:**
        - **Transparent**: You are proudly an AI agent.
        - **Conversational**: Speak naturally. Use brief pauses.
        - **Polite**: Always acknowledge their greeting before moving on.

        **IMPORTANT - The Link:**
        If they agree to receive the text, you MUST use this specific link in your message: ${shareUrl || '[Link not provided]'}

        **Script Flow:**

        1. **Opening** (This is your first message):
           "Hi, this is Catherine, Portstyle's AI Sales Agent. Is ${lead.first_name || 'the manager'} available?"

        2. **If they say "Speaking", "This is him/her", or just "Hello":**
           "Hi ${lead.first_name || 'there'}. The reason I'm calling is that we've handpicked some new product bundles specifically for your store."
           
           "They combine our best-sellers with your inventory to help boost sales. I'd love to just text you a link to check them out. Would that be okay?"

        3. **Handling "Yes" (Send Text):**
           "Great. Is this the best mobile number for you: ${sanitizedPhone}?"
           *(If yes)*: "Perfect. Sending it over now... Done! Let me know what you think."
           *(Wait for them to acknowledge, then say)*: "Thanks! Have a great day."

        4. **Handling "No" / "Busy" / "Not Interested":**
           "Totally get it. I can just shoot you an email instead if that's easier?"
           *(If still no)*: "No worries at all. Have a great day!"

        5. **If they ask "Are you a robot?":**
           "Yes, I'm an AI agent helping the Portstyle team reach out to our partners more efficiently. But I can definitely get a real person to call you if you prefer?"
        `

        // 5. Call Vapi API
        const vapiPrivateKey = Deno.env.get('VAPI_PRIVATE_KEY')!
        const vapiPhoneNumberId = Deno.env.get('VAPI_PHONE_NUMBER_ID')

        if (!vapiPhoneNumberId) {
            throw new Error('VAPI_PHONE_NUMBER_ID is not set in Supabase secrets')
        }

        // Dynamic Caller ID Routing
        let selectedPhoneNumberId = vapiPhoneNumberId

        // List of Canadian Area Codes (NANP)
        const canadianAreaCodes = [
            '204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438',
            '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709',
            '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'
        ]

        // Check if it's a +1 number and has a Canadian area code
        if (sanitizedPhone.startsWith('+1')) {
            const areaCode = sanitizedPhone.substring(2, 5)
            if (canadianAreaCodes.includes(areaCode)) {
                const caPhoneId = Deno.env.get('VAPI_PHONE_NUMBER_ID_CA')
                if (caPhoneId) {
                    console.log(`Detected Canadian number (${areaCode}), using CA Caller ID`)
                    selectedPhoneNumberId = caPhoneId
                } else {
                    console.warn(`Detected Canadian number (${areaCode}) but VAPI_PHONE_NUMBER_ID_CA is not set. Using default.`)
                }
            }
        }

        const callBody = {
            phoneNumberId: selectedPhoneNumberId,
            customer: {
                number: sanitizedPhone,
                name: `${lead.first_name} ${lead.last_name}`.trim()
            },
            assistant: {
                firstMessage: `Hi, this is Catherine, Portstyle's AI Sales Agent. Is ${lead.first_name || 'the manager'} available?`,
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
                            description: "Send a text message with the promotion link to the customer.",
                            parameters: {
                                type: "object",
                                properties: {
                                    phoneNumber: {
                                        type: "string",
                                        description: "The customer's phone number to text (e.g. +15550000000)."
                                    },
                                    message: {
                                        type: "string",
                                        description: `The message content to send. MUST include the link: ${shareUrl || 'the promotion link'}`
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
                voice: "jennifer-playht", // Example voice
                serverUrl: Deno.env.get('SUPABASE_URL') + '/functions/v1/handle-call-webhook'
            }
        }

        const vapiResponse = await fetch('https://api.vapi.ai/call', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vapiPrivateKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(callBody)
        })

        if (!vapiResponse.ok) {
            const errText = await vapiResponse.text()
            throw new Error(`Vapi API Error: ${vapiResponse.status} ${errText}`)
        }

        const vapiData = await vapiResponse.json()

        // 5. Log to Database
        const { error: logError } = await supabase
            .from('call_logs')
            .insert({
                lead_id: leadId,
                proposal_id: proposalId,
                provider_call_id: vapiData.id,
                status: 'queued',
                outcome: 'pending'
            })

        if (logError) console.error('Error logging call:', logError)

        return new Response(
            JSON.stringify({ success: true, callId: vapiData.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Error making call:', error)
        // Return 200 with error details so client can display it
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }
})
