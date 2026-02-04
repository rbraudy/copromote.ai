import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/std@0.177.0/dotenv/load.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
