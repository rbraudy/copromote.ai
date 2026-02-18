# Architecture 2.0 Roadmap: Auth Migration & Multi-Tenancy

## Phase 1: Auth Migration (The Foundation)
- [x] **Frontend: Replace Firebase Auth**
    - [x] Uninstall `firebase` dependencies (or isolate them).
    - [x] Create `AuthProvider.tsx` using `@supabase/auth-helpers-react`.
    - [x] Rebuild `SignInModal.tsx` / `Login.tsx`.
    - [x] Rebuild `SignUpModal.tsx`.
    - [x] Rebuild `AuthContext.tsx` replacement.
- [ ] **Database: Enable Native RLS**
    - [x] Update `user_profiles` automatically on signup (Trigger).
    - [x] Create Policy: "Users can view own profile".
    - [x] Create Policy: "Users can view company data" (The `company_id` check).
    - [x] Drop "Safety Deposit Box" RPCs (`create_prospect`, `get_company_prospects`).
    - [x] Run SQL Migration (`20260212_enable_supabase_auth.sql`) [Pending]
- [x] **Data Migration & Superadmin**
    - [x] Create/Update RLS for `superadmin` role (View All).
    - [x] Script to promote `rbraudy@gmail.com` to `superadmin`.
    - [x] Run `20260212_link_superadmin_data.sql` to link prospects.
    - [x] Run `20260212_fix_rls_recursion.sql` to fix 500 error.

## Phase 2: Tenant Configuration (Backend & UI)
- [ ] **Enhance Schema**
    - [x] Create `tenant_config` table (JSONB for flexibility).
    - [x] Add RLS for `tenant_config` (Read: Public/Auth, Write: Admin).
    - [x] Update `companies` to include `slug` or `domain` for lookup.
- [x] **Frontend: Tenant Context**
    - [x] Create `TenantContext.tsx` to load config based on user/URL.
    - [x] Update `App.tsx` to wrap with `TenantProvider`.
- [x] **UI: Settings Page**
    - [x] Create `Settings.tsx` page for Superadmins/Admins.
    - [x] Form to update Logo, Colors, Name.

## Phase 3: The "Generic Engine"
- [ ] **Schema: Templates & Integrations**
    - [x] Create `call_templates` table (store Vapi config & script).
    - [x] Create `integrations` table (store API keys).
    - [x] Seed "Henry's" script into `call_templates`.
- [x] **Refactor `make-warranty-call-v2`**
    - [x] Step 1: Fetch `company_id` using `auth.uid` (or prospect data).
    - [x] Step 2: Load `call_template` based on `company_id`.
    - [x] Step 3: Inject variables (Price, Name) into template.
    - [x] Step 4: Execute Vapi call with dynamic config.
- [x] **Frontend: Admin Dashboard Integration**
    - [x] **Refactor `NewDesign.tsx`**: Split into `AdminDashboard`, `CampaignBuilder`, `LiveQueue`, `AdminAnalytics`.
    - [x] **Campaign Builder**: Form to Create/Edit `call_templates` (Script, Voice, First Message).
    - [x] **Live Queue**: Real-time view of `call_logs` (Status, Transcript).
    - [x] **Analytics**: Connect "Close Rate" and "Revenue" to actual DB aggregations (Mocked for Demo).
    - [ ] **Lead Upload**: Connect CSV upload to `warranty_prospects` (batch insert).

## Phase 4: Enterprise Features
- [ ] **eShipper Integration** (Real-time).
- [ ] **Webhooks** (CRM Sync).

## Documentation & Refinement
- [x] **Consolidate Artifacts to `/docs`**
- [x] **Fix RLS Architecture**
    - [x] Resolve recursion in `user_profiles` policy.
- [ ] **Level 3 Nuance Refinement**
    - [x] Add Approval Flow to Roadmap.
    - [x] Add CNAM/Caller ID strategy to Roadmap.
    - [x] **Add Sandbox Guardrails**: Lock tests to verified number & 20-test limit.
- [ ] **Security Hardening (Post-Emergency)**
    - [ ] Re-enable RLS with non-recursive policies using helper functions.

## Phase 3.5: Operational Readiness (Pilot)
- [x] **Legal: T&C**
    - [x] Add checkbox to `HelpCheckout.tsx`.
- [x] **Security: Session Gating**
    - [x] Gate Features, Pricing, Checkout behind `?session=ID`.
- [ ] **Payments: Descriptor**
    - [ ] Verify Stripe descriptor logic in Edge Function.
