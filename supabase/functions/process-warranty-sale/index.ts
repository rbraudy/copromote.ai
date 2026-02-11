import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { prospectId, plan, paymentDetails } = await req.json();

        if (!prospectId || !plan) {
            throw new Error("Missing prospectId or plan");
        }

        console.log(`Processing sale for prospect: ${prospectId}, Plan: ${plan.name}`);

        // 1. Verify Prospect exists
        const { data: prospect, error: prospectError } = await supabase
            .from('warranty_prospects')
            .select('*')
            .eq('id', prospectId)
            .single();

        if (prospectError || !prospect) {
            throw new Error(`Prospect not found: ${prospectError?.message}`);
        }

        // 2. (Mock) Process Payment
        // In production, integration with Stripe/Moneris would go here.
        const transactionId = `tx_${crypto.randomUUID().split('-')[0]}`;
        console.log(`Payment successful. Transaction ID: ${transactionId}`);

        // 3. Update Database Records
        // Update Prospect -> Enrolled
        const { error: updatePropsectError } = await supabase
            .from('warranty_prospects')
            .update({
                status: 'enrolled',
                outcome: 'won'
            })
            .eq('id', prospectId);

        if (updatePropsectError) console.error("Error updating prospect:", updatePropsectError);

        // Update Session -> Converted
        const { error: updateSessionError } = await supabase
            .from('warranty_sessions')
            .update({
                status: 'converted',
                current_price: parseInt(plan.price.replace(/[^0-9]/g, '')) // Store integer price
            })
            .eq('prospect_id', prospectId)
            .eq('status', 'discounted'); // Only update if it was the active session (optional safety)

        if (updateSessionError) console.error("Error updating session:", updateSessionError);

        // 4. Generate JSON Report for Henry's
        const saleReport = {
            transactionId,
            timestamp: new Date().toISOString(),
            customer: {
                firstName: prospect.first_name,
                lastName: prospect.last_name,
                phone: prospect.phone,
                email: prospect.email // Assuming we have this, or collected it in checkout
            },
            product: {
                sku: prospect.product_sku,
                name: prospect.product_name,
                purchaseDate: prospect.purchase_date
            },
            warranty: {
                plan: plan.name,
                price: plan.price,
                term: plan.period
            },
            metadata: {
                source: 'copromote_ai_voice_pilot',
                campaign: 'henrys_warranty_v1'
            }
        };

        console.log("Generated Sale Report for Henry's:", JSON.stringify(saleReport, null, 2));

        // 5. (TODO) Forward Report
        // Email or FTP logic would go here.

        return new Response(
            JSON.stringify({
                success: true,
                transactionId,
                message: "Warranty activated successfully."
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error("Sale Processing Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
