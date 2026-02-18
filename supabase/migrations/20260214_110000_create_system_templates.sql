-- Create system_templates table for "Gold Standard" scripts
CREATE TABLE IF NOT EXISTS public.system_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'retail',
    is_gold_standard BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view system templates"
    ON public.system_templates FOR SELECT
    USING (true);

CREATE POLICY "Only superadmins can manage system templates"
    ON public.system_templates FOR ALL
    USING (public.is_superadmin());
