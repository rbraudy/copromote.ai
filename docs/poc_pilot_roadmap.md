# Proof of Concept (PoC) Roadmap
**Project:** AI-Driven Warranty Protection Pilot
**Goal:** Generate warranty sales and validate customer sentiment with minimal technical integration.

---

## 1. Executive Summary
The objective of this Pilot is to **generate warranty sales**. Rather than building a perfect, fully integrated enterprise ecosystem on Day 1, we will launch a contained "Calibration Phase." This allows us to validate the AI script, ensure brand safety, and prove ROI with zero risk to the core technical infrastructure.

**The Strategy: Crawl, Walk, Run.**
*   **Crawl (The Pilot)**: Manual Data (CSV), Small Batch (50 Users), High Oversight.
*   **Walk (Beta)**: Automated Data (eShipper), Weekly Batches, Dashboard Access.
*   **Run (Scale)**: Full Real-Time Integration, CRM Sync.

---

## 2. Pilot Scope (The "Box")
To ensure a successful and timely launch, the Pilot is strictly bounded by the following parameters. **Any feature requests outside this box will be moved to Phase 2.**

### ✅ In Scope (Deliverables)
1.  **Audience**: 50 Past Customers who have *already received* their item (to ensure happy path).
    *   *Source*: A simple `.csv` file (Name, Phone, Product, Value, Purchase Date).
2.  **The Agent**:
    *   "Henry's Warranty Concierge" Persona.
    *   Script: Optimized for **"Challenger vs Consultative"** sales (as approved by leadership).
    *   Offer: Selling 2 and 3 year warranties (10% Discount or Monthly Plan options).
3.  **The Destination**:
    *   A **Henry's branded**, secure landing page (`/checkout`) where the customer sees their specific product and pricing.
    *   Secure Stripe checkout.
4.  **Reporting**:
    *   Call Recordings & Transcripts for every interaction.
    *   Conversion Rate & Sentiment Analysis.

### ⛔ Out of Scope (Phase 2)
*   Real-time API integrations (eShipper, Shopify, NetSuite) — *Manual CSV is faster for <100 calls.*
*   Complex multi-SKU bundles (e.g. Camera + Lens separate coverage).
*   Custom UI changes to the checkout flow — *Standard optimized flow used for speed.*

---

## 3. Operational Readiness (Critical Gaps to Close)
Before we launch, we must align on these 3 operational details to avoid customer confusion:

1.  **Inbound Handling**: When a customer calls back, who answers?
    *   *Action*: We will aim to forward the number to the Henry's Extended Warranty desk (TBD).
2.  **Payment Descriptor**: "Henry's Camera Store" (Must NOT reference CoPromote).
3.  **Caller ID**: We need a dedicated Henry's phone number so the call display shows "Henry's".
4.  **SMS Branding**: We need approved marketing collateral/images so our texts are properly branded as Henry's.
5.  **Legal Compliance**:
    *   *Action*: We need the text for the "Terms & Conditions" to add a checkbox on the checkout page.

---

## 4. "Go-Live" Checklist
We can launch within **two weeks** of receiving these three items:

### Step 1: Implementation Checklist (Henry's Team)
**We're excited to work with you to complete the following. Based on your final approval via email or signature, we'll go-live with the Proof of Concept.**
*   [ ] **The Script & Persona**: Approve the "Henry's Warranty Concierge" script, including the specific tone (Challenger vs Consultative).
*   [ ] **The Knowledge Base**: Provide specific warranty details (PDFs/URLs) - we'll train the agent to reference these when appropriate (e.g., "Does this cover water damage?").
*   [ ] **The Offer**: confirm the allowable discount (e.g., 10%) and authorization to waive the 30-day wait period if applicable.
    *   *Decision Needed*: Do they want to offer a **Monthly Plan** (flexibility) or a **1-Year Plan** (revenue lock-in)?
*   [ ] **Financial Setup**:
    *   Confirm **Stripe Connect** setup (so funds flow directly to Henry's).
    *   **Recommendation**: We offer **One-Time Payments** (e.g., $199) or **Multi-Year Billing** to lower the one-time price.
*   [ ] **Data Handover**: Provide the CSV list of 50 received orders for manual update in Henry's ERP.

### Step 2: Deployment (CoPromote)
*   [ ] Upload list to Secure Dashboard.
*   [ ] Run "Calibration Calls" (Internal test).
*   [ ] **GO LIVE**: Trigger the batch of 50 calls.

---

## 4. Success Metrics & Data Return
**How you get the data back:**
To avoid complex ERP integration (Dynamics 365) during the Pilot, we will provide the results in a format that your team can easily ingest manually or Audit.

*   **Output Format**: A secure `.csv` or `.json` file containing:
    *   Customer ID / Order ID.
    *   Outcome (Sale, Refusal, Issue Reported).
    *   Call Transcript or Recording Link.
    *   Stripe Transaction ID (if purchased).
*   **ERP Update Strategy**: Your team can simply upload this CSV into Dynamics 365 to update the warranty status, or we can provide a JSON file for your IT team to script against.

## 5. Review & Next Steps
After the 50 calls are complete (approx. **500 minutes** of runtime), we will hold a **Performance Review** to measure:

1.  **Conversion Rate**: How did we compare to in-store HELP purchases?
2.  **Customer Sentiment**: Did customers feel helped or bothered? (AI Sentiment Score).
3.  **Objection Analysis**: What were the top reasons for saying "No"?

**Decision Point:**
*   **Pass**: We proceed to "Walk" phase (eShipper Integration, Monthly Payments, & Larger Lists).
*   **Refine**: We tweak the script/pricing and run another batch of 50.

---

## Message to Stakeholders
*To ensure the integrity of the data, we recommend limiting the number of active stakeholders during the Pilot Phase. We will provide a comprehensive "Read-Only" report to all departments (Marketing, Legal, IT) **after** the first batch of 50 calls is complete. Pre-optimization by committee often delays the critical data we need to prove success.*
