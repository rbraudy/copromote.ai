const SUPABASE_URL = 'https://tikocqefwifjcfhgqdyj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpa29jcWVmd2lmamNmaGdxZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzY2NTIsImV4cCI6MjA3OTkxMjY1Mn0.6kJFZwE5JlYLAgZF00olzz1iHlC_kVFeASwLTlJRT-A';

async function main() {
    try {
        console.log("1. Fetching a Lead...");
        const leadsRes = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=*&limit=1`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!leadsRes.ok) throw new Error(`Failed to fetch leads: ${leadsRes.status}`);
        const leads = await leadsRes.json();

        if (leads.length === 0) {
            console.log("No leads found. Cannot proceed.");
            return;
        }

        const lead = leads[0];
        console.log(`Found Lead: ${lead.id} (Seller: ${lead.seller_id})`);

        console.log("2. Calling suggestBundles...");
        const suggestRes = await fetch(`${SUPABASE_URL}/functions/v1/suggestBundles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                leadId: lead.id,
                sellerId: lead.seller_id
            })
        });

        if (!suggestRes.ok) {
            const err = await suggestRes.text();
            throw new Error(`suggestBundles failed: ${suggestRes.status} - ${err}`);
        }

        const suggestionsData = await suggestRes.json();
        const suggestions = suggestionsData.suggestions || [];

        if (suggestions.length === 0) {
            console.log("No suggestions returned.");
            return;
        }

        const bundle = suggestions[0];
        console.log(`Selected Bundle: ${bundle.bundle_title}`);
        console.log(`Seller Product: ${bundle.seller_product_id}`);
        console.log(`Seller Image: ${bundle.seller_product_image}`);
        console.log(`Partner Product: ${bundle.customer_product_id}`);
        console.log(`Partner Image: ${bundle.partner_product_image}`);

        console.log("3. Calling generateVignetteGemini (V2)...");
        const genRes = await fetch(`${SUPABASE_URL}/functions/v1/generateVignetteGemini`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                bundle: bundle,
                style: 'photorealistic product photography',
                setting: 'modern kitchen'
            })
        });

        if (!genRes.ok) {
            const err = await genRes.text();
            throw new Error(`generateVignetteGemini failed: ${genRes.status} - ${err}`);
        }

        const genData = await genRes.json();
        console.log("---------------------------------------------------");
        console.log("SUCCESS! Generated Image URL:");
        console.log(genData.imageUrl);
        console.log("---------------------------------------------------");

    } catch (e) {
        console.error("Error:", e);
        const fs = await import('fs');
        fs.writeFileSync('error_log.txt', e.toString());
    }
}

main();
