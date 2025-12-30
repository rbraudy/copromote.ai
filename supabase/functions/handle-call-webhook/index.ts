import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        const body = await req.json()
        console.log('Webhook received:', JSON.stringify(body))

        // Vapi sends different message types.
        const message = body.message

        if (!message) {
            console.log('No message in body')
            return new Response('No message', { status: 200 })
        }

        console.log('Message Type:', message.type)

        // Handle Tool Calls (e.g. sendSms)
        if (message.type === 'tool-calls') {
            console.log('Handling tool-calls message')
            const toolCalls = message.toolCalls
            const results = []

            for (const toolCall of toolCalls) {
                console.log('Processing tool call:', toolCall.function.name)

                if (toolCall.function.name === 'sendSms') {
                    try {
                        let args = toolCall.function.arguments
                        if (typeof args === 'string') {
                            try {
                                args = JSON.parse(args)
                            } catch (e) {
                                console.error('Failed to parse arguments JSON:', e)
                                throw new Error('Invalid JSON arguments')
                            }
                        }

                        const { phoneNumber, message } = args
                        console.log(`Sending SMS to ${phoneNumber}: ${message}`)

                        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
                        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
                        const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

                        if (!accountSid || !authToken || !fromNumber) {
                            throw new Error('Twilio credentials not set')
                        }

                        // Twilio API Call
                        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
                        const formData = new URLSearchParams()
                        formData.append('To', phoneNumber)
                        formData.append('From', fromNumber)
                        formData.append('Body', message)

                        console.log('Sending request to Twilio...')
                        const twilioResponse = await fetch(twilioUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: formData
                        })

                        if (!twilioResponse.ok) {
                            const errText = await twilioResponse.text()
                            console.error('Twilio API Error:', errText)
                            throw new Error(`Twilio Error: ${twilioResponse.status} ${errText}`)
                        }

                        console.log('SMS sent successfully')
                        results.push({
                            toolCallId: toolCall.id,
                            result: "SMS sent successfully."
                        })

                    } catch (err: any) {
                        console.error('Error processing sendSms:', err)
                        results.push({
                            toolCallId: toolCall.id,
                            error: `Failed to send SMS: ${err.message}`
                        })
                    }
                } else {
                    console.log('Unknown tool:', toolCall.function.name)
                    results.push({
                        toolCallId: toolCall.id,
                        result: "Function not found"
                    })
                }
            }

            // Return results to Vapi
            const responseBody = JSON.stringify({ results: results })
            console.log('Returning results to Vapi:', responseBody)

            return new Response(responseBody, {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            })
        }

        // Handle End of Call Report
        if (message.type === 'end-of-call-report') {
            const call = message.call
            if (!call) return new Response('No call data', { status: 200 })

            // 1. Initialize Supabase
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!
            const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!
            const supabase = createClient(supabaseUrl, serviceKey)

            // 2. Update Call Log
            const durationSeconds = Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
            const durationInterval = `${durationSeconds} seconds`

            // Map connection status to SUCCESS/FAIL
            // Vapi endedReasons that count as SUCCESS: 'customer-ended-call', 'assistant-ended-call', 'hangup'
            const successReasons = ['customer-ended-call', 'assistant-ended-call', 'hangup']
            const connectionStatus = successReasons.includes(call.endedReason) ? 'SUCCESS' : 'FAIL'

            // Check if link was sent (look for sendSms tool call)
            const linkSent = call.analysis?.toolCalls?.some((tc: any) => tc.function.name === 'sendSms') || false

            const { error } = await supabase
                .from('call_logs')
                .update({
                    status: call.status,
                    connection_status: connectionStatus,
                    duration: durationInterval,
                    link_sent: linkSent,
                    outcome: call.analysis?.summary || call.endedReason,
                    transcript: call.transcript,
                    recording_url: call.recordingUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('provider_call_id', call.id)

            if (error) {
                console.error('Error updating call log:', error)
                throw error
            }

            // 3. Update related Warranty Prospect status if applicable
            const { data: logEntry } = await supabase
                .from('call_logs')
                .select('warranty_prospect_id')
                .eq('provider_call_id', call.id)
                .single()

            if (logEntry?.warranty_prospect_id) {
                let newStatus = 'called'
                const analysis = (call.analysis?.summary || '').toLowerCase()
                if (analysis.includes('enrolled') || analysis.includes('bought') || analysis.includes('yes')) {
                    newStatus = 'enrolled'
                } else if (analysis.includes('declined') || analysis.includes('not interested') || analysis.includes('no')) {
                    newStatus = 'declined'
                }

                await supabase
                    .from('warranty_prospects')
                    .update({ status: newStatus })
                    .eq('id', logEntry.warranty_prospect_id)
            }

            return new Response('OK', { status: 200 })
        }

        return new Response('Ignored', { status: 200 })

    } catch (error: any) {
        console.error('Webhook Error:', error)
        return new Response(error.message, { status: 500 })
    }
})
