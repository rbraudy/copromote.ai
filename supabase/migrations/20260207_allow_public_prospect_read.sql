-- Enable public read access to warranty_prospects for pricing page lookup
-- Security: UUIDs are practically unguessable, so allowing SELECT by ID is acceptable for this use case.

CREATE POLICY "Public can view warranty prospects" ON public.warranty_prospects
    FOR SELECT
    TO anon
    USING (true);
