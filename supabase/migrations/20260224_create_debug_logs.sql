-- Create system_debug_logs table for advanced error reporting
CREATE TABLE IF NOT EXISTS system_debug_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    function_name TEXT,
    error_type TEXT,
    severity TEXT DEFAULT 'ERROR',
    payload JSONB,
    raw_response TEXT,
    stack_trace TEXT,
    metadata JSONB
);

-- Enable RLS
ALTER TABLE system_debug_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can manage logs (internal system usage)
CREATE POLICY "Service Role Only" ON system_debug_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Authenticated users can read logs (for dashboard troubleshooting)
CREATE POLICY "Authenticated Read" ON system_debug_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_debug_logs_function ON system_debug_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON system_debug_logs(created_at DESC);
