-- Add knowledge_base column to campaign_configs
ALTER TABLE public.campaign_configs 
ADD COLUMN IF NOT EXISTS knowledge_base JSONB DEFAULT '[]'::jsonb;

-- Comment on the column for clarity
COMMENT ON COLUMN public.campaign_configs.knowledge_base IS 'Stores metadata for uploaded documents (name, url, type, size)';
