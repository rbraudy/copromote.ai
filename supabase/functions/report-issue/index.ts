import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { issueType, description, priority, prospectId, customerName, customerPhone } = await req.json()
    console.log('Report Issue Payload:', { issueType, customerName });

    // Configuration
    const subdomain = 'setonexecutivesearch';
    const emailRaw = Deno.env.get('ZENDESK_EMAIL');
    const tokenRaw = Deno.env.get('ZENDESK_API_TOKEN');

    if (!emailRaw || !tokenRaw) {
      throw new Error('Missing Zendesk credentials');
    }

    // Safely trim
    const email = emailRaw.trim();
    const token = tokenRaw.trim();

    // Debugging (Masked)
    console.log(`Zendesk Config Check: Email present? ${!!emailRaw}, Token present? ${!!tokenRaw}`);
    if (tokenRaw) console.log(`Token starts with: ${tokenRaw.substring(0, 4)}...`);

    const authString = `${email}/token:${token}`;
    const authHeader = `Basic ${btoa(authString)}`;

    console.log(`Auth Debug: String length: ${authString.length}, Encoded length: ${authHeader.length}`);
    console.log(`Auth String (Masked): ${email.substring(0, 3)}.../token:${token.substring(0, 3)}...`);

    const url = `https://${subdomain}.zendesk.com/api/v2/tickets.json`;

    const ticketBody = {
      ticket: {
        subject: `Warranty Issue: ${issueType} - ${customerName}`,
        comment: {
          body: `Issue Report\n\nCustomer: ${customerName}\nPhone: ${customerPhone}\nProspect ID: ${prospectId}\n\nType: ${issueType}\nDescription: ${description}`
        },
        priority: priority || 'normal',
        tags: ['warranty_issue', 'ai_agent', issueType],
        type: 'problem'
      }
    };

    console.log('Creating Zendesk ticket...');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticketBody)
    });

    const data = await res.json();

    if (!res.ok) {
      // Fallback: log raw response
      const errorText = JSON.stringify(data);
      console.error('Zendesk Error:', errorText);
      throw new Error(`Zendesk API Error: ${errorText}`);
    }

    console.log(`Ticket Created: #${data.ticket.id}`);

    // --- SEND SMS CONFIRMATION ---
    try {
      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER');
      const twilioFromCa = Deno.env.get('TWILIO_PHONE_NUMBER_CA');

      if (twilioSid && twilioAuthToken && twilioFrom) {
        // Determine "From" number (simple logic: if +1 and not US, maybe CA? keeping it simple for now or defaulting to US)
        // Actually, let's just use the default logic or checking if it starts with +1
        let fromNumber = twilioFrom;
        // Basic check if it looks like a Canadian area code (optional, but maybe overkill here. disabling unless requested)

        const smsBody = `Hi ${customerName}, thanks for reporting the issue with your unit. We've created ticket #${data.ticket.id} and a specialist will contact you shortly.`;

        const smsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${twilioSid}:${twilioAuthToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: customerPhone,
              From: fromNumber,
              Body: smsBody,
            }),
          }
        );

        if (smsRes.ok) {
          console.log('Confirmation SMS sent.');
        } else {
          console.error('Failed to send SMS:', await smsRes.text());
        }
      }
    } catch (smsError) {
      console.error('SMS Logic Error:', smsError);
      // Do not fail the whole request if SMS fails, just log it.
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticketId: data.ticket.id,
        url: `https://${subdomain}.zendesk.com/agent/tickets/${data.ticket.id}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
