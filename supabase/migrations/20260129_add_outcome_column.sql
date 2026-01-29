-- Add outcome column to call_logs if it doesn't exist
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS outcome TEXT; -- 'sale', 'declined', 'issue', 'voicemail', 'completed'

-- Add index for analytics performance
CREATE INDEX IF NOT EXISTS idx_call_logs_outcome ON public.call_logs(outcome);
