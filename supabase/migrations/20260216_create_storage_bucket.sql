-- Insert the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-knowledge', 'campaign-knowledge', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for the bucket
-- Allow authenticated users to upload to their company's folder (conceptually)
-- For simplicity in this demo environment, we'll allow authenticated users to manage files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'campaign-knowledge' );

CREATE POLICY "Authenticated Users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'campaign-knowledge' );

CREATE POLICY "Authenticated Users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'campaign-knowledge' );

CREATE POLICY "Authenticated Users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'campaign-knowledge' );
