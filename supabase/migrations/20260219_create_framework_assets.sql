-- Migration: Create Framework Assets for Lead Sales Architect
-- Date: 2026-02-19

-- 1. Create/Update System Methodologies Table
CREATE TABLE IF NOT EXISTS public.system_methodologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    skeleton_markdown TEXT NOT NULL,
    logic_triggers JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure slug exists
ALTER TABLE public.system_methodologies ADD COLUMN IF NOT EXISTS slug TEXT;

-- ENSURE UNIQUE CONSTRAINTS (Required for ON CONFLICT)
DO $$ 
BEGIN
    -- Fix name uniqueness
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_methodologies_name_key') THEN
        ALTER TABLE public.system_methodologies ADD CONSTRAINT system_methodologies_name_key UNIQUE (name);
    END IF;
    -- Fix slug uniqueness
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_methodologies_slug_key') THEN
        ALTER TABLE public.system_methodologies ADD CONSTRAINT system_methodologies_slug_key UNIQUE (slug);
    END IF;
END $$;

-- 2. Create/Update System Battle Cards Table
CREATE TABLE IF NOT EXISTS public.system_battle_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objection TEXT NOT NULL,
    rebuttal TEXT NOT NULL,
    proof_point TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure category exists and category_name is migrated if it existed
DO $$ 
BEGIN
    -- 1. Rename category_name to category if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_battle_cards' AND column_name='category_name') THEN
        ALTER TABLE public.system_battle_cards RENAME COLUMN category_name TO category;
    END IF;

    -- 2. Add category column if neither category nor category_name existed (unlikely but safe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_battle_cards' AND column_name='category') THEN
        ALTER TABLE public.system_battle_cards ADD COLUMN category TEXT NOT NULL;
    END IF;

    -- 3. Add unique constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_battle_cards_category_objection_key') THEN
        ALTER TABLE public.system_battle_cards ADD CONSTRAINT system_battle_cards_category_objection_key UNIQUE (category, objection);
    END IF;
END $$;

-- 3. Update Campaign Configs Table
ALTER TABLE public.campaign_configs ADD COLUMN IF NOT EXISTS offer_discount NUMERIC DEFAULT 0;

-- 4. Enable RLS and add basic policies
ALTER TABLE public.system_methodologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_battle_cards ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to methodologies') THEN
        CREATE POLICY "Allow public read access to methodologies" ON public.system_methodologies FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to battle cards') THEN
        CREATE POLICY "Allow public read access to battle cards" ON public.system_battle_cards FOR SELECT TO public USING (true);
    END IF;
END $$;

-- 5. Seed Initial Methodologies
INSERT INTO public.system_methodologies (name, slug, description, skeleton_markdown)
VALUES 
('Challenger Sale', 'challenger', 'A disruptive questioning framework designed to reframe customer assumptions.', '### STAGE 1: THE WARMER\nEstablish credibility by demonstrating industry insight.\n\n### STAGE 2: THE REFRAME\nIdentify a problem the customer didn''t realize they had.\n\n### STAGE 3: RATIONAL DROWNING\nUse data and logic to show why staying with the status quo is risky.\n\n### STAGE 4: EMOTIONAL IMPACT\nConnect the rational risk to the customer''s personal pain.\n\n### STAGE 5: A NEW WAY\nIntroduce a solution framework addressing the Reframe.\n\n### STAGE 6: THE SOLUTION\nPresent [PRODUCT_CATEGORY] as the specific answer.'),
('Consultative Selling', 'consultative', 'A rapport-based discovery framework focused on trust and relationship building.', '### STAGE 1: RAPPORT BUILDING\nEstablish a genuine connection with the customer.\n\n### STAGE 2: DISCOVERY\nAsk deep, open-ended questions to uncover needs.\n\n### STAGE 3: TAILORED SOLUTION\nPresent features that specifically solve the uncovered problems.\n\n### STAGE 4: COLLABORATION\nInvite the customer to participate in the solution design.'),
('SPIN Selling', 'spin', 'Unfolds around Situation, Problem, Implication, and Need-payoff questions.', '### STAGE 1: SITUATION\nEstablish context.\n\n### STAGE 2: PROBLEM\nIdentify specific difficulties.\n\n### STAGE 3: IMPLICATION\nHelp customer understand the consequences.\n\n### STAGE 4: NEED-PAYOFF\nFocus on the value of solving the problem.')
ON CONFLICT (name) DO UPDATE SET 
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    skeleton_markdown = EXCLUDED.skeleton_markdown;

-- 6. Seed Initial Battle Cards
INSERT INTO public.system_battle_cards (category, objection, rebuttal, proof_point)
VALUES 
('Camera Warranties', 'I already have a manufacturer warranty.', 'The manufacturer covers defects, not accidents. High-end glass is fragile.', '72% of camera failures in the first 3 years are due to impact or liquid.'),
('HVAC', 'I''ll just fix it if it breaks.', 'Emergency repairs carry a "Panic Premium." A plan locks in today''s rates.', 'Emergency HVAC calls can cost 3x more than scheduled service.'),
('Consumer Electronics', 'I''m careful with my devices.', 'Micro-soldering means even a small drop can break an internal connection.', '85% of modern electronics require full component replacement if dropped.')
ON CONFLICT (category, objection) DO NOTHING;
