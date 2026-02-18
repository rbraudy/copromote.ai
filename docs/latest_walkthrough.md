# Pilot Readiness & Architecture Walkthrough

We have successfully implemented the critical fixes and architectural foundations for the Henry's Pilot.

## 1. Magic Pricing & Real-time Updates
**Goal**: Ensuring discounts offered by the AI are immediately visible on the landing page.

### Changes
- **`useDiscount` Hook**: Centralized logic for fetching pricing and subscribing to real-time updates.
- **`HelpFeatures.tsx`**: Now listens for discounts and displays a "Manager's Special" banner.
- **`HelpPricing.tsx`**: Refactored to use the shared hook, ensuring consistent pricing display.

### Verification
1. Open the landing page with a session ID: `http://localhost:5173/henrys?session=[YOUR_UUID]`
2. In Supabase (or via Edge Function), update `warranty_prospects` for `id='[YOUR_UUID]'` with `offer_discount_triggered=true` and `discount_price=17500`.
3. **Observe**: The "Manager's Special" banner should appear instantly.
4. Click "See Pricing". The 2-Year Plan should show **$175** (down from $199).

## 2. Checkout & Reporting
**Goal**: Enabling web-based checkout and sales reporting.

### Changes
- **`process-warranty-sale` Edge Function**: Handles sales logic, updates prospect status, and generates JSON reports.
- **`HelpCheckout.tsx`**: Integrated to call the new Edge Function instead of a mock timeout.

### Verification
1. Proceed to Checkout from the Pricing page.
2. Fill in the form and click "Pay".
3. **Observe**: A success alert with a Transaction ID (simulated).
4. **Backend**: Check `warranty_prospects` table; status should be `enrolled` and notes updated.

## 3. Architecture & Scalability
**Goal**: Preparing for multi-tenancy and pilot robustness.

### Changes
- **Database Schema**: Created `companies`, `user_profiles`, `call_templates`, and `integrations` tables.
- **RLS Policies**: Fixed `call_logs` policies to allow company-wide access.
- **Config-Driven Calls**: Refactored `make-warranty-call-v2` to load prompts, voice settings, and messages dynamically from `call_templates` if a company template exists.

## Next Steps
- Apply the new migration files to your Supabase instance.
- Populate `call_templates` with Henry's specific scripts if you wish to move away from the hardcoded defaults.

## 2026-02-13 Emergency: Vapi 400 Error Fix
- **Issue**: Vapi API rejected the `smart_format` property in the transcriber config (400 Bad Request).
- **Solution**: Removed the deprecated property from the `make-warranty-call-v2` Edge Function.
- **Verification**: User needs to deploy the function and test the call again.
