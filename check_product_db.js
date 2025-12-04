import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || 'https://tikocqefwifjcfhgqdyj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sellerProductId = '7702516826288'; // From the failed test log

async function checkProduct() {
    console.log(`Checking product ID: ${sellerProductId}`);
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', sellerProductId)
        .single();

    if (error) {
        console.error("Error fetching product:", error);
    } else {
        console.log("Product Data:");
        console.log(`ID: ${data.id}`);
        console.log(`Name: ${data.name}`);
        console.log(`Image URL: ${data.image_url || data.imageUrl}`); // Check both fields
    }
}

checkProduct();
