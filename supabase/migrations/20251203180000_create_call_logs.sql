-- Create call_logs table
CREATE TABLE IF NOT EXISTS public.call_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
    proposal_id uuid REFERENCES public.copromotions(id) ON DELETE CASCADE,
    provider_call_id text,
    status text DEFAULT 'queued', -- queued, in-progress, completed, failed, voicemail
    outcome text, -- interested, not-interested, callback, voicemail
    transcript text,
    recording_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own call logs"
    ON public.call_logs
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT seller_id FROM public.copromotions WHERE id = proposal_id
        )
    );

CREATE POLICY "Users can insert call logs"
    ON public.call_logs
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT seller_id FROM public.copromotions WHERE id = proposal_id
        )
    );

CREATE POLICY "Users can update their own call logs"
    ON public.call_logs
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT seller_id FROM public.copromotions WHERE id = proposal_id
        )
    );
