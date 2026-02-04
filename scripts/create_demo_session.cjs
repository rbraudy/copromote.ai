
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env manually
function loadEnv() {
    const vars = {};
    const files = ['.env', '.env.local'];

    files.forEach(file => {
        try {
            const envPath = path.resolve(__dirname, `../${file}`);
            if (fs.existsSync(envPath)) {
                const envFile = fs.readFileSync(envPath, 'utf8');
                envFile.split('\n').forEach(line => {
                    const [key, val] = line.split('=');
                    if (key && val) {
                        vars[key.trim()] = val.trim().replace(/"/g, '');
                    }
                });
            }
        } catch (e) {
            // Ignore missing files
        }
    });
    return vars;
}

const env = loadEnv();
const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Missing SUPABASE_URL or SERVICE_RULE_KEY in .env");
    console.log("Supabase URL Found:", !!supabaseUrl);
    console.log("Supabase Key Found:", !!supabaseKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSession() {
    const sessionName = "Demo Customer " + Math.floor(Math.random() * 1000);

    const { data, error } = await supabase
        .from('warranty_sessions')
        .insert({ customer_name: sessionName, current_price: 199, status: 'active' })
        .select()
        .single();

    if (error) {
        console.error("Error creating session:", error);
    } else {
        console.log("\n✅ Demo Session Created!");
        console.log("------------------------------------------");
        console.log("Session ID (Prospect ID):", data.id);
        console.log("Customer:", data.customer_name);
        console.log("------------------------------------------");
        console.log(`\n🔗 Open this URL to test the Magic Pricing:`);
        console.log(`http://localhost:5173/henrys/pricing?session=${data.id}`);
        console.log(`(Or your production URL: https://copromote.ai/henrys/pricing?session=${data.id})`);
    }
}

createSession();
