-- Migration: Upgrade Methodologies to Warranty-First Blueprints
-- Date: 2026-02-23

-- 1. Update Challenger Sale for Warranty Depth
UPDATE public.system_methodologies 
SET skeleton_markdown = '### STAGE 1: THE DISRUPTIVE WARMER
Establish credibility as a "Protection Concierge" for [BRAND_NAME]. 
Acknowledge their recent purchase of the [PRODUCT_CATEGORY] and congratulate them on the choice.
*Goal: Move from "Salesperson" to "Equipment Specialist".*

### STAGE 2: THE REFRAME (The "Modern Technology" Hook)
Reframe the conversation around the complexity of [PRODUCT_CATEGORY] technology.
Mention that while products are better than ever, they are now "High-Precision Computers" (e.g., micro-soldering, LiDAR, 4K OLED panels).
*Key insight: Traditional repairs are no longer possible; it''s full component replacement now.*

### STAGE 3: RATIONAL DROWNING (The Cost of Repair)
Provide specific data points on out-of-warranty repair costs for [PRODUCT_CATEGORY].
Contrast the low cost of the protection plan with the high cost of a single display or motherboard replacement.
*Focus: The "Panic Premium" of emergency repairs.*

### STAGE 4: EMOTIONAL IMPACT (Lifestyle Disruption)
Connect the mechanical failure to a literal lifestyle disruption.
For TVs: "Imagine the screen going dark 10 minutes before the Super Bowl."
For Stereos: "The silence when guests arrive for your party because of a blown capacitor."
For Phones: "The isolation of being without your primary connection for 7 days while waiting for parts."

### STAGE 5: THE PROTECTION SOLUTION
Introduce the [PLAN_NAME] not as an "insurance" but as a "Guarantee of Service."
Highlight: $0 Deductibles, Tech-to-Door service, and "Like-New" replacement guarantee.

### STAGE 6: THE ASSUMPTIVE CLOSE
Don''t ask if they want it. Ask *which* path makes more sense (e.g., "Would you prefer the simplified 2-year total cover, or the maximum 5-year peace of mind?").'
WHERE slug = 'challenger';

-- 2. Update Consultative Selling for Warranty Discovery (The "Henry's Gold Standard")
UPDATE public.system_methodologies 
SET skeleton_markdown = '### STAGE 1: THE CONCIERGE OPEN & THE GIFT
Introduce yourself as a "[BRAND_NAME] Concierge". 
Deliver the "Gift" immediately: "The reason for my call is that we''ve actually gifted you 7 days of [BRAND_NAME] Protection at no charge just for being a customer. It''s already active on your account."
*Goal: Lower defenses by providing value before asking questions.*

### STAGE 2: PURCHASE VERIFICATION & RAPPORT
"Have you had an opportunity to get your new [PRODUCT_CATEGORY] out of the box and test it out yet?"

### STAGE 3: USE-CASE DISCOVERY
Uncover how the product is used to identify high-risk factors.
"Between us, is this in a high-traffic area, or maybe a dedicated space?"
"Is it primarily for yourself, or do you have a busy household with kids or pets?"
*Goal: Identity "Accidental" vs "Mechanical" value props.*

### STAGE 4: TAILORED PROTECTION PITCH
Connect the protection features to THEIR specific usage using the 7-day bridge.
"While your 7-day gift is active, I recommend locking in long-term coverage because of [USE_CASE]."
If Kids: Focus on liquid/impact protection.
If Solo: Focus on technical longevity and power surge protection.

### STAGE 5: COLLABORATIVE OPTIONING
Walk through the available tiers ({{price_1yr}}, {{price_2yr}}).
Invite them to choose the duration that fits their planned ownership cycle.
"Most of our [BRAND_NAME] owners keep their [PRODUCT_CATEGORY] for about 4 years; does it make sense to protect the full lifecycle, or just the first half?"

### STAGE 6: THE "LOCK-IN" CLOSE
Reiterate that as their Concierge, your goal is to ensure they never pay for the same product twice.
"I''ll get this attached to your serial number now so you''re fully locked in."'
WHERE slug = 'consultative';

-- 3. Update SPIN Selling for Warranty Implications
UPDATE public.system_methodologies 
SET skeleton_markdown = '### STAGE 1: SITUATION (Environment)
"How much are you relying on your [PRODUCT_CATEGORY] for your daily routine/entertainment?"

### STAGE 2: PROBLEM (The Manufacturer Gap)
"Did you know the standard manufacturer warranty typically only covers factory defects, meaning things like power surges or accidental damage are usually a total loss out of pocket?"

### STAGE 3: IMPLICATION (The Financial Loss)
"If a power surge hit your neighborhood tomorrow and fried the motherboard on your [PRODUCT_PRICE] purchase, what would your plan be for replacement? Would you be comfortable buying it all over again at full price?"

### STAGE 4: NEED-PAYOFF (The Safety Net)
"If I could show you a way to lock in a $0 repair/replacement guarantee for less than the cost of a few pizzas, would that take some of the stress off your plate?"'
WHERE slug = 'spin';

-- 4. Seed Category-Specific Battle Cards for Stereos, TVs, and Phones
INSERT INTO public.system_battle_cards (category, objection, rebuttal, proof_point)
VALUES 
('TV', 'I don''t need it, TVs last forever.', 'Modern OLED and NanoCell panels are stunning but highly sensitive to power surges and heat-related pixel failure.', 'The cost to replace a 65-inch 4K panel is often 85% of the original TV price.'),
('Stereo', 'If it works now, it''ll work later.', 'High-end audio components generate significant heat. Over time, capacitors can dry out and solder points can crack, leading to "dead channels."', 'Audio component failures usually require specialized board-level repair which averages $450 in labor alone.'),
('Phone', 'I have a sturdy case.', 'A case protects the frame, but internal LiDAR sensors and multi-lens camera systems are highly susceptible to internal vibration damage and micro-fractures.', 'Internal sensor recalibration typically requires a full device replacement by the manufacturer.'),
('Camera', 'I''m a professional, I don''t drop my gear.', 'Professional use means higher shutter counts and more sensor exposure. Even without a drop, mechanical shutter failure is a matter of "when", not "if".', 'The average lifespan of a pro-grade mechanical shutter is 200k clicks; replacement costs can exceed $600.')
ON CONFLICT (category, objection) DO UPDATE SET
    rebuttal = EXCLUDED.rebuttal,
    proof_point = EXCLUDED.proof_point;
