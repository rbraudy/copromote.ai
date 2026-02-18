// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { companyId, refinement_notes } = await req.json()
        if (!companyId) throw new Error('Missing companyId')

        // 1. Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, serviceKey)

        // 2. Fetch Config & Template
        const { data: config, error: configError } = await supabase
            .from('campaign_configs')
            .select('*')
            .eq('company_id', companyId)
            .single()

        if (configError) throw new Error(`Config not found: ${configError.message}`)

        const { data: template, error: templateError } = await supabase
            .from('system_templates')
            .select('*')
            .eq('id', config.system_template_id)
            .single()

        if (templateError) throw new Error(`Template not found: ${templateError.message}`)

        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('name')
            .eq('id', companyId)
            .single()

        const companyName = company?.name || "Our Company"

        // 3. Fetch Knowledge Base Content (MVP: Text types only for now)
        let knowledgeBaseContent = "";
        if (config.knowledge_base && Array.isArray(config.knowledge_base)) {
            for (const doc of config.knowledge_base) {
                if (doc.type === 'text/plain' || doc.name.endsWith('.txt')) {
                    try {
                        const response = await fetch(doc.url);
                        if (response.ok) {
                            const text = await response.text();
                            knowledgeBaseContent += `\n--- DOCUMENT: ${doc.name} ---\n${text}\n`;
                        }
                    } catch (err) {
                        console.error(`Failed to fetch document ${doc.name}:`, err);
                    }
                } else {
                    knowledgeBaseContent += `\n--- DOCUMENT REFERENCE: ${doc.name} (${doc.type}) ---\n[Content ingestion for this file type is pending. Please acknowledge that this document exists as a reference.]\n`;
                }
            }
        }

        // 4. Fetch Reference Scripts (existing scripts selected by user)
        let referenceScriptsContent = "";
        if (config.selected_script_ids && Array.isArray(config.selected_script_ids) && config.selected_script_ids.length > 0) {
            const { data: scripts } = await supabase
                .from('call_templates')
                .select('system_prompt, updated_at')
                .in('id', config.selected_script_ids);

            if (scripts) {
                for (const s of scripts) {
                    referenceScriptsContent += `\n--- REFERENCE SCRIPT (Updated: ${s.updated_at}) ---\n${s.system_prompt}\n`;
                }
            }
        }

        // 5. Construct LLM Prompt for Script Generation
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiApiKey) throw new Error("Missing GEMINI_API_KEY");

        const prompt = `
You are an expert AI Voice Script Engineer. Your goal is to take a "Gold Standard" script framework and customize it for a specific product and brand using structured configuration.

### MASTER FRAMEWORK (GOLD STANDARD):
${template.content}

- AGENT NAME: ${config.agent_name || 'Sarah'}
- BRAND NAME: ${companyName}
- PRODUCT CATEGORY: ${config.product_info?.name || 'our product'}
- SALES METHODOLOGY: ${config.agent_behavior?.sales_philosophy === 'ai_choice' ? 'Determined by Discovery Engine' : config.agent_behavior?.sales_philosophy}
- OFF-LIMIT TOPICS (GUARDRAILS): ${config.guardrails?.join(', ') || 'Standard professional boundaries'}
- CUSTOM USER REFINEMENTS: ${refinement_notes || 'No specific tweaks requested.'}

### KNOWLEDGE BASE / REFERENCE MATERIAL:
${knowledgeBaseContent || 'No additional documents provided.'}

### REFERENCE SCRIPTS (PAST CAMPAIGNS):
${referenceScriptsContent || 'No reference scripts selected.'}

### INSTRUCTIONS:
1. CUSTOMIZE the "STYLE & VIBE" section based on the SALES METHODOLOGY:
   - If 'challenger', use teaching and controlling language.
   - If 'consultative', emphasize trust and relationship building.
   - If 'spin', focus on uncovering implications and needs.
   - If 'ai_choice', use a balanced, adaptive 'Gold Standard' approach.
2. ENFORCE GUARDRAILS: Add a explicit section in the script instructions to NEVER discuss the off-limit topics. If the customer brings them up, the agent must politely steer the conversation back.
3. APPLY USER REFINEMENTS: Prioritize the instructions in "CUSTOM USER REFINEMENTS." If the user says "Don't use filler words" or "Be more direct," explicitly instruct the agent to follow these stylistic rules.
4. INGEST KNOWLEDGE: Use the provided KNOWLEDGE BASE / REFERENCE MATERIAL and REFERENCE SCRIPTS to inform the "SCRIPT FLOW" and "OBJECTION HANDLING". Ensure the agent maintains consistency with the brand voice and logic found in reference scripts while incorporating new knowledge base content.
5. RETAIN CORE LOGIC: Maintain the "SCRIPT FLOW" and "OBJECTION HANDLING" from the Gold Standard framework, but rewrite them to fit the Product Category, Knowledge Base, and User Refinements.
6. OUTPUT format: Return a single string that will be used as the SYSTEM PROMPT for a Vapi AI Agent.

DO NOT include any conversational filler in your response. Just the final script.
`;

        console.log("Calling Gemini API to generate script...");

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 1,
                    topK: 1,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            throw new Error(`Gemini API Error: ${geminiResponse.status} - ${errText}`);
        }

        const geminiData = await geminiResponse.json();
        const generatedScript = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedScript) throw new Error('Gemini failed to generate a script.');

        // 4. Update call_templates
        const { error: upsertError } = await supabase
            .from('call_templates')
            .upsert({
                company_id: companyId,
                system_prompt: generatedScript,
                updated_at: new Date().toISOString()
            });

        if (upsertError) throw new Error(`Failed to save generated script: ${upsertError.message}`);

        // 5. Mark config as generated
        await supabase
            .from('campaign_configs')
            .update({ is_generated: true })
            .eq('company_id', companyId);

        return new Response(
            JSON.stringify({ script: generatedScript }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error occurred' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
