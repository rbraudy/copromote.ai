-- Add missing columns to campaign_configs table for full state persistence
ALTER TABLE public.campaign_configs 
ADD COLUMN IF NOT EXISTS guardrails JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS program_profile JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS selected_script_ids JSONB DEFAULT '[]'::jsonb;

-- Comment on columns for clarity
COMMENT ON COLUMN public.campaign_configs.guardrails IS 'List of off-limits topics or competitors';
COMMENT ON COLUMN public.campaign_configs.program_profile IS 'Settings for pricing models, durations, and retention triggers';
COMMENT ON COLUMN public.campaign_configs.selected_script_ids IS 'IDs of scripts selected as reference material from call_templates';
