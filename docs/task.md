# Architecture 2.0 Roadmap: Auth Migration & Multi-Tenancy

## Phase 1: Auth Migration (The Foundation)
- [x] **Frontend: Replace Firebase Auth**
    - [x] Create `AuthProvider.tsx` using `@supabase/auth-helpers-react`.
    - [x] Rebuild `SignInModal.tsx` / `Login.tsx`.
    - [x] Rebuild `AuthContext.tsx` replacement.
- [ ] **Database: Native RLS (Hardening Required)**
    - [x] Update `user_profiles` automatically on signup (Trigger).
    - [x] **2026-02-13: Safe Mode Recovery** (RLS temporarily disabled to stop infinite loops).
    - [ ] Re-enable RLS with non-recursive logic.

## Phase 2: Tenant Configuration (Backend & UI)
- [x] **Frontend: Tenant Context**
    - [x] Create `TenantContext.tsx` to load config based on user/URL.
- [x] **UI: Settings Page**
    - [x] Create `CampaignBuilder.tsx` to edit scripts directly.

## Phase 3: The "Generic Engine"
- [x] **Refactor `make-warranty-call-v2`**
    - [x] Load prompts, voice, and messages dynamically from `call_templates`.
- [x] **Frontend: Admin Dashboard Integration**
    - [x] Split into `AdminDashboard`, `CampaignBuilder`, `LiveQueue`.

## Technical Debt & Maintenance
- [ ] **Security Hardening**: Convert "Safe Mode" back to hardened RLS.
- [ ] **Audit Logging**: Need a record of all script changes.
- [ ] **Level 3 Nuance**: Implement "Human-in-the-Loop" approval UI & **20-call Sandbox limit**.
- [ ] **Payments**: Verify Stripe descriptor logic in Edge Function.
