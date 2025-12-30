-- Add warranty_prospect_id to call_logs
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS warranty_prospect_id UUID REFERENCES public.warranty_prospects(id) ON DELETE CASCADE;

-- Update RLS policies for call_logs to include warranty prospects
-- We need to ensure sellers can see logs for their own warranty prospects
CREATE POLICY "Users can view logs of their warranty prospects"
    ON public.call_logs
    FOR SELECT
    USING (
        warranty_prospect_id IN (
            SELECT id FROM public.warranty_prospects WHERE seller_id = auth.uid()::text
        )
    );
