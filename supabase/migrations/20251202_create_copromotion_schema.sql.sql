-- Create Leads table (CRM for potential partners)
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id TEXT NOT NULL, -- Changed to TEXT to match Firebase UID format
    store_url TEXT NOT NULL,
    contact_info TEXT,
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'converted'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on leads (only seller can see their leads)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own leads" ON public.leads
    FOR ALL USING (auth.uid()::text = seller_id)
    WITH CHECK (auth.uid()::text = seller_id);


-- Create External Products table (Scraped data)
CREATE TABLE public.external_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    title TEXT,
    image_url TEXT,
    price NUMERIC,
    is_edited BOOLEAN DEFAULT false,
    original_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on external_products (inherit access from lead)
ALTER TABLE public.external_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage external products of their leads" ON public.external_products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.leads
            WHERE leads.id = external_products.lead_id
            AND leads.seller_id = auth.uid()::text
        )
    );


-- Create Copromotions table
CREATE TABLE public.copromotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id TEXT NOT NULL, -- Matches user_id in products table
    lead_id UUID REFERENCES public.leads(id), -- Nullable if created directly with a customer (future proofing)
    customer_id TEXT, -- Nullable, filled after conversion. Matches user_id in products table.
    seller_product_id TEXT NOT NULL REFERENCES public.products(id),
    external_product_id UUID REFERENCES public.external_products(id), -- The scraped product used for the proposal
    converted_product_id TEXT REFERENCES public.products(id), -- The real product after conversion
    status TEXT DEFAULT 'draft', -- 'draft', 'proposed', 'active', 'rejected'
    creation_method TEXT, -- 'manual', 'semi_auto', 'auto'
    outreach_method TEXT, -- 'voice_ai', 'manual'
    offer_details JSONB, -- { discount: 20, moq: 10, duration: '30 days' }
    marketing_assets JSONB, -- { bundle_image: 'url', copy: 'text' }
    public_token TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on copromotions
ALTER TABLE public.copromotions ENABLE ROW LEVEL SECURITY;

-- Policy: Seller can see their own copromotions
CREATE POLICY "Sellers can manage their copromotions" ON public.copromotions
    FOR ALL USING (seller_id = auth.uid()::text);

-- Policy: Public access via token (for the proposal page)
-- Note: RLS usually requires an authenticated user. For public access, we often use a Postgres function with `SECURITY DEFINER` 
-- or we just rely on the Edge Function to bypass RLS. 
-- For now, we will allow public read if they have the token (this is tricky in pure RLS without a user).
-- Actually, since we are using Edge Functions for the public page, we can bypass RLS there.
-- So we don't need a public RLS policy here yet.

