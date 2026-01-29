-- Drop potentially conflicting or complex policies
DROP POLICY IF EXISTS "Users can view logs of their warranty prospects" ON public.call_logs;
DROP POLICY IF EXISTS "Users can view their own call logs" ON public.call_logs;

-- Re-create a robust policy
-- We use a straightforward EXISTS clause which is often better optimized
CREATE POLICY "Users can view logs of their warranty prospects"
    ON public.call_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.warranty_prospects
            WHERE public.warranty_prospects.id = public.call_logs.warranty_prospect_id
            AND public.warranty_prospects.seller_id = auth.uid()::text
        )
    );

-- Ensure Insert is also allowed (though mostly done by service role)
-- Service role bypasses RLS, so this is just for consistency if client inserts ever happen
CREATE POLICY "Users can insert logs for their prospects"
    ON public.call_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.warranty_prospects
            WHERE public.warranty_prospects.id = public.call_logs.warranty_prospect_id
            AND public.warranty_prospects.seller_id = auth.uid()::text
        )
    );
