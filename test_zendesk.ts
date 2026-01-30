// Test script for report-issue function
// Run with: deno run --allow-net --allow-env test_zendesk.ts

const SUPABASE_URL = "https://tikocqefwifjcfhgqdyj.supabase.co"; // derived from previous context
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || ""; // User needs to provide this or I'll assume valid if running inside context? 
// Actually I'll use the service role key if I can find it, or ask the user to run it via the dashboard?
// Better: I will create a script that uses the known URL and tries to hit it.

async function testReportIssue() {
    console.log("Testing report-issue function...");

    const payload = {
        issueType: "Test Issue",
        description: "This is a manual test from the debugger.",
        priority: "normal",
        customerName: "Test User",
        customerPhone: "555-000-0000",
        prospectId: "test-prospect-id"
    };

    try {
        // We use the function URL directly. 
        // Note: You might need the Authorization header (Bearer ANON_KEY) for this to work if RLS/VerifyJWT is on. 
        // But I deployed with --no-verify-jwt so it should be open or simple.

        const res = await fetch(`${SUPABASE_URL}/functions/v1/report-issue`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("Response Status:", res.status);
        console.log("Response Data:", JSON.stringify(data, null, 2));

        if (!res.ok) {
            console.error("Test Failed!");
        } else {
            console.log("Test Passed! Check Zendesk for the ticket.");
        }

    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

testReportIssue();
