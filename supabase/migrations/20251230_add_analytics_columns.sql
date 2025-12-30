-- Migration: Add analytics columns to call_logs and warranty_prospects
-- Description: Adds duration, connection status, link tracking, and conversion columns.

-- 1. Update call_logs
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS duration INTERVAL,
ADD COLUMN IF NOT EXISTS connection_status TEXT CHECK (connection_status IN ('SUCCESS', 'FAIL')),
ADD COLUMN IF NOT EXISTS communication_sent TEXT,
ADD COLUMN IF NOT EXISTS link_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS link_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchase_made BOOLEAN DEFAULT false;

-- 2. Update warranty_prospects
ALTER TABLE public.warranty_prospects
ADD COLUMN IF NOT EXISTS call_attempts INTEGER DEFAULT 0;

-- 3. Add index for analytics performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_call_logs_warranty_prospect_id ON public.call_logs(warranty_prospect_id);

-- 4. Helper Function to increment call attempts
CREATE OR REPLACE FUNCTION increment_call_attempts(prospect_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.warranty_prospects
    SET call_attempts = call_attempts + 1
    WHERE id = prospect_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Helper Function to increment link clicks
CREATE OR REPLACE FUNCTION increment_link_clicks(log_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.call_logs
    SET link_clicks = link_clicks + 1
    WHERE id = log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
