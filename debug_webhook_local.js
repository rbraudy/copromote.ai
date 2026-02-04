
// debug_webhook_local.js

// Mock Environment Variables mimicking Supabase Secrets
const Deno = {
    env: {
        get: (key) => {
            const envs = {
                'TWILIO_ACCOUNT_SID': 'AC_MOCK_SID',
                'TWILIO_AUTH_TOKEN': 'mock_token',
                'TWILIO_PHONE_NUMBER': '+15550001234',
                'ZENDESK_EMAIL': 'mock@example.com',
                'ZENDESK_API_TOKEN': 'mock_token',
                'SUPABASE_URL': 'https://mock.supabase.co',
                'SUPABASE_SERVICE_ROLE_KEY': 'mock_key'
            };
            return envs[key];
        }
    }
};

// Mock Fetch Global
global.fetch = async (url, options) => {
    console.log(`\n[FETCH] Request to: ${url}`);
    console.log(`[FETCH] Method: ${options.method}`);
    if (options.body) {
        // handle URLSearchParams vs JSON
        if (options.body instanceof URLSearchParams) {
            console.log(`[FETCH] Body: ${options.body.toString()}`);
        } else {
            console.log(`[FETCH] Body: ${options.body}`);
        }
    }

    if (url.includes('twilio')) {
        return {
            ok: true,
            json: async () => ({ status: 'queued', sid: 'SMmockmessage' })
        };
    }
    if (url.includes('zendesk')) {
        return {
            ok: true,
            json: async () => ({ ticket: { id: 12345 } })
        };
    }
    return { ok: true, json: async () => ({}) };
};

// Mock the core logic from handle-call-webhook-v2/index.ts
// I'm pasting the critical logic block here to test parsing
async function processWebhook(body) {
    console.log(`Webhook Received: type=${body.type}`);
    const { type, call, toolCalls, message } = body;
    const callObj = call || message?.call || body.call;

    // Logic from the file
    const actualToolCalls = toolCalls || message?.toolCalls || callObj?.toolCalls;
    if (actualToolCalls) console.log(`Tool Calls detected: ${actualToolCalls.length}`);

    if (actualToolCalls) {
        const results = [];
        for (const tc of actualToolCalls) {
            console.log(`Processing Tool Call: ${tc.function.name}`);

            if (tc.function.name === 'sendSms') {
                let args;
                try {
                    // Logic from file: 
                    // args = typeof tc.function.arguments === 'string'
                    //     ? JSON.parse(tc.function.arguments)
                    //     : tc.function.arguments;
                    if (typeof tc.function.arguments === 'string') {
                        console.log('Parsing string arguments...');
                        args = JSON.parse(tc.function.arguments);
                    } else {
                        console.log('Using object arguments...');
                        args = tc.function.arguments;
                    }
                } catch (e) {
                    console.error('Failed to parse arguments:', tc.function.arguments);
                    args = {};
                }
                console.log('Parsed Args:', JSON.stringify(args));

                // Simulate Send Logic
                const { phoneNumber, message: smsMessage } = args;
                const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
                const token = Deno.env.get('TWILIO_AUTH_TOKEN');
                let from = Deno.env.get('TWILIO_PHONE_NUMBER');

                // Normalize From
                if (from && !from.startsWith('+')) {
                    from = from.length === 10 ? `+1${from}` : `+${from}`;
                }

                console.log(`Attempting to send from ${from} to ${phoneNumber}`);

                if (from && sid && token) {
                    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
                        method: 'POST',
                        body: new URLSearchParams({ To: phoneNumber, From: from, Body: smsMessage })
                    });
                }
            }
        }
    }
}

// TEST CASES
(async () => {
    console.log('--- TEST CASE 1: Standard Vapi Tool Call (Object Args) ---');
    await processWebhook({
        type: 'tool-calls',
        toolCalls: [{
            id: 'call_1',
            function: {
                name: 'sendSms',
                arguments: { phoneNumber: '+14155551212', message: 'Hello World' }
            }
        }]
    });

    console.log('\n--- TEST CASE 2: Vapi Tool Call (String Args - JSON) ---');
    await processWebhook({
        type: 'tool-calls',
        toolCalls: [{
            id: 'call_2',
            function: {
                name: 'sendSms',
                arguments: '{"phoneNumber": "+14155551212", "message": "Stringified JSON"}'
            }
        }]
    });

    console.log('\n--- TEST CASE 3: Nested Message Structure (Vapi sometimes sends this) ---');
    await processWebhook({
        message: {
            type: 'tool-calls',
            toolCalls: [{
                id: 'call_3',
                function: {
                    name: 'sendSms',
                    arguments: { phoneNumber: '+14155551212', message: 'Nested payload' }
                }
            }]
        }
    });

})();
