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
        const { leadId, proposalId } = await req.json()

        if (!leadId || !proposalId) {
            throw new Error('Missing leadId or proposalId')
        }

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

        // 3. Construct the AI System Prompt
        const systemPrompt = `
        You are an AI assistant for ${proposal.offer_details?.title || 'a promotion'}.
        You are calling ${lead.first_name || 'the partner'} at ${lead.company_name || 'their store'}.
        Your goal is to tell them about a new co-promotion opportunity.
        
        Details:
        - Bundle: ${proposal.offer_details?.title}
        - Description: ${proposal.offer_details?.description}
        - Discount: ${proposal.offer_details?.discount}%
        
        Script:
        1. Introduce yourself as calling from Copromote.
        2. Mention the bundle opportunity.
        3. Ask if they are interested in hearing more.
        4. If yes, say you will send them a link.
        5. If no, thank them and goodbye.
        `

        // 4. Call Vapi API
        const vapiPrivateKey = Deno.env.get('VAPI_PRIVATE_KEY')!
        const vapiPhoneNumberId = Deno.env.get('VAPI_PHONE_NUMBER_ID')

        if (!vapiPhoneNumberId) {
            throw new Error('VAPI_PHONE_NUMBER_ID is not set in Supabase secrets')
        }

        // Sanitize phone number (remove spaces, dashes, parentheses)
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
                firstMessage: `Hi ${lead.first_name || 'there'}, I'm calling from Copromote about a new partnership opportunity. Do you have a minute?`,
                model: {
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        }
                    ]
                },
                voice: "jennifer-playht" // Example voice
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
