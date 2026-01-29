import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Report Issue Payload:', JSON.stringify(body))

    const { issueType, description, prospectId, customerName, customerPhone, sentiment } = body

    if (!issueType || !description) {
      throw new Error('Missing required fields: issueType, description')
    }

    const mondayApiKey = Deno.env.get('MONDAY_API_KEY')
    const boardId = Deno.env.get('MONDAY_BOARD_ID') // e.g. 18397723016
    const userId = Deno.env.get('MONDAY_USER_ID')   // e.g. 99004418
    const apiVersion = '2023-10'

    let mondayItemId = null
    let mondayError = null

    // --- MONDAY.COM INTEGRATION ---
    if (mondayApiKey && boardId) {
      try {
        console.log('Creating item in Monday.com...')

        // 1. Fetch Board Columns to find correct IDs
        const queryColumns = `
          query {
            boards (ids: [${boardId}]) {
              columns {
                id
                title
                type
              }
            }
          }
        `
        const colRes = await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: {
            'Authorization': mondayApiKey,
            'Content-Type': 'application/json',
            'API-Version': apiVersion
          },
          body: JSON.stringify({ query: queryColumns })
        })
        const colData = await colRes.json()
        const columns = colData.data?.boards?.[0]?.columns || []

        // Find IDs for columns (case-insensitive try)
        const emailCol = columns.find((c: any) => c.title.toLowerCase() === 'email');
        const phoneCol = columns.find((c: any) => c.title.toLowerCase() === 'phone');
        const firstNameCol = columns.find((c: any) => c.title.toLowerCase() === 'first name' || c.title.toLowerCase() === 'firstname');
        const lastNameCol = columns.find((c: any) => c.title.toLowerCase() === 'last name' || c.title.toLowerCase() === 'lastname');
        const dateCol = columns.find((c: any) => c.title.toLowerCase() === 'date' || c.title.toLowerCase() === 'date created');

        const columnValues: any = {
          status: { label: "Working on it" },
        }

        // Split Name
        let firstName = '';
        let lastName = '';
        if (customerName) {
          const parts = customerName.split(' ');
          firstName = parts[0];
          lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
        }

        // Map Columns
        if (emailCol) {
          // we don't have email in the request usually, but if we did:
          // columnValues[emailCol.id] = { email: "example@test.com", text: "example@test.com" }; // Email column format
          // For now, leaving blank as we only have phone usually.
        }

        if (phoneCol) {
          if (customerPhone) {
            const numericPhone = customerPhone.replace(/\D/g, '')
            // Phone column format: { phone: "+1...", countryShortName: "US" } or just string in some API versions
            // Try string first, if fails we might need object
            columnValues[phoneCol.id] = numericPhone
          }
        }

        if (firstNameCol) columnValues[firstNameCol.id] = firstName;
        if (lastNameCol) columnValues[lastNameCol.id] = lastName;
        if (dateCol) columnValues[dateCol.id] = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const itemName = `Issue: ${issueType} - ${customerName || 'Unknown'}`

        const createMutation = `
          mutation {
            create_item (
              board_id: ${boardId},
              item_name: "${itemName}",
              column_values: ${JSON.stringify(JSON.stringify(columnValues))}
            ) {
              id
            }
          }
        `

        const createRes = await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: {
            'Authorization': mondayApiKey,
            'Content-Type': 'application/json',
            'API-Version': apiVersion
          },
          body: JSON.stringify({ query: createMutation })
        })

        const createData = await createRes.json()
        if (createData.errors) {
          console.error('Monday Create Error:', createData.errors)
          throw new Error('Failed to create Monday item: ' + JSON.stringify(createData.errors))
        }

        mondayItemId = createData.data.create_item.id
        console.log('Monday Item Created:', mondayItemId)

        // OPTIMIZATION: Return immediately after getting the ID to prevent AI silence.
        // Perform updates and notifications in the background.
        const backgroundTasks = async () => {
          try {
            // 2. Add Update (Comment) with full details & Link
            const prospectLink = `https://copromote.ai/prospect/${prospectId || ''}`
            const updateBody = `
                  <b>Issue Reported by AI Agent</b><br>
                  <b>Type:</b> ${issueType}<br>
                  <b>Customer:</b> ${customerName} (${customerPhone})<br>
                  <b>Description:</b> ${description}<br>
                  <b>Sentiment:</b> ${sentiment || 'N/A'}<br>
                  <br>
                  <a href="${prospectLink}">View Call Recording & Prospect</a>
                `

            const updateMutation = `
                  mutation {
                    create_update (
                      item_id: ${mondayItemId},
                      body: ${JSON.stringify(updateBody)}
                    ) {
                      id
                    }
                  }
                `

            await fetch('https://api.monday.com/v2', {
              method: 'POST',
              headers: {
                'Authorization': mondayApiKey,
                'Content-Type': 'application/json',
                'API-Version': apiVersion
              },
              body: JSON.stringify({ query: updateMutation })
            })
            console.log('Monday Update Added')

            // 3. Trigger Notification
            if (userId) {
              const notificationText = `AI Alert: New ${issueType} reported for ${customerName}`
              const notificationMutation = `
                      mutation {
                        create_notification (
                          user_id: ${userId},
                          target_id: ${mondayItemId},
                          text: "${notificationText}",
                          target_type: Project
                        ) {
                          id
                        }
                      }
                    `
              await fetch('https://api.monday.com/v2', {
                method: 'POST',
                headers: {
                  'Authorization': mondayApiKey,
                  'Content-Type': 'application/json',
                  'API-Version': apiVersion
                },
                body: JSON.stringify({ query: notificationMutation })
              })
              console.log('Monday Notification Sent')
            }

            // 4. Send SMS Confirmation (Twilio)
            // We do this server-side to ensure it happens even if the AI forgets to call the sendSms tool.
            const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
            const token = Deno.env.get('TWILIO_AUTH_TOKEN')
            let from = Deno.env.get('TWILIO_PHONE_NUMBER')

            if (sid && token && from && customerPhone) {
              // Canadian Routing Logic
              const caCodes = ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'];

              // Check if Canadian
              let targetPhone = customerPhone.toString().trim()
              // Normalize target if needed (assumed E.164 context from make-warranty-call-v2, but be safe)

              if (targetPhone.startsWith('+1')) {
                const area = targetPhone.substring(2, 5)
                if (caCodes.includes(area)) {
                  const caNumber = Deno.env.get('TWILIO_PHONE_NUMBER_CA')
                  if (caNumber) from = caNumber
                }
              }

              // Normalize From
              // (If Env var is 1234567890, make it +11234567890)
              if (!from.startsWith('+')) {
                from = from.length === 10 ? `+1${from}` : `+${from}`
              }

              const productName = body.productName || "purchase" // We need to pass productName in the payload if possible, or fallback

              // Construct the specific message requested
              const smsMessage = `Hi ${customerName.split(' ')[0]}, we have received your report regarding the ${description.includes('damaged') ? 'damaged ' : ''}${productName}. Your Incident ID is ${mondayItemId}. Our team is prioritizing this matter and we will contact you shortly with a resolution. Thank you for your patience. - Henry's Camera`

              console.log(`Sending SMS to ${targetPhone} from ${from}`)

              const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
                method: 'POST',
                headers: {
                  'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ To: targetPhone, From: from, Body: smsMessage })
              })

              if (!twRes.ok) {
                const errTxt = await twRes.text()
                console.error('Twilio Error:', errTxt)
              } else {
                console.log('SMS Sent Successfully')
              }
            } else {
              console.log('Skipping SMS: Missing Twilio Credentials or Customer Phone')
            }

          } catch (bgErr) {
            console.error('Background Task Error:', bgErr)
          }
        }

        // Execute background tasks without awaiting
        // Note: In Supabase Edge Functions, use EdgeRuntime.waitUntil if available to ensure completion
        // If not available, we just don't await.
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          EdgeRuntime.waitUntil(backgroundTasks())
        } else {
          backgroundTasks()
        }

      } catch (err) {
        console.error('Monday API Exception:', err)
        mondayError = err.message
      }
    } else {
      console.warn('Skipping Monday.com: Missing API Key or Board ID')
      mondayError = 'Configuration missing'
    }

    // --- OUTLOOK EMAIL INTEGRATION (Placeholder) ---
    // TODO: Implement Microsoft Graph API or SMTP when credentials are provided.
    // console.log('Sending Email via Outlook...')

    return new Response(JSON.stringify({
      success: true,
      mondayItemId,
      mondayError
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Report Issue Error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
