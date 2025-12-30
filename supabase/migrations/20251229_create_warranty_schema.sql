-- Create warranty_prospects table
CREATE TABLE IF NOT EXISTS public.warranty_prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    product_name TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    expiry_date DATE GENERATED ALWAYS AS (purchase_date + INTERVAL '30 days') STORED,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'called', 'enrolled', 'declined')),
    incentive_offered TEXT,
    call_log_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.warranty_prospects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own warranty prospects" ON public.warranty_prospects
    FOR ALL USING (auth.uid()::text = seller_id)
    WITH CHECK (auth.uid()::text = seller_id);

-- Optional: Create index on phone and seller_id
CREATE INDEX idx_warranty_prospects_phone ON public.warranty_prospects(phone);
CREATE INDEX idx_warranty_prospects_seller ON public.warranty_prospects(seller_id);
