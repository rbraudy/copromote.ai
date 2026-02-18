# Internal Security Gap Analysis

This document outlines potential security/compliance gaps that enterprise clients (like Henry's management or IT security teams) might identify during due diligence. It includes our current status and recommended responses.

## 1. Application-Level Audit Logs
*   **The Expectation:** "If my employee changes the warranty price or updates the system prompt, I want a log of *who* did it and *when*."
*   **Our Current State:**
    *   ✅ We log all *AI Calls* (`call_logs`).
    *   ❌ We do **not** exhaustively log *admin configuration changes* (e.g., edits to `call_templates`, `integrations`, or `user_profiles`).
*   **Risk Level:** Low/Medium (Common requirement for SOC 2).
*   **Recommended Response:** "We currently maintain comprehensive logs of all AI-customer interactions. Granular administrative activity logging is scheduled for our Q3 roadmap."

## 2. Encryption of Secrets (API Keys)
*   **The Expectation:** "How do you store my Shopify API Token or E-Shipper credentials?"
*   **Our Current State:**
    *   ✅ Stored in `integrations` table.
    *   ✅ Protected by Row-Level Security (RLS).
    *   ✅ Protected by Provider-Level Disk Encryption (AWS/Supabase).
    *   ❌ **Not** encrypted at the column/application level (i.e., a raw database dump reveals the keys).
*   **Risk Level:** Low. (RLS + Disk Encryption is standard for most SaaS).
*   **Recommended Response:** "Keys are stored in a dedicated, isolated table protected by strict RLS policies and encrypted at rest via our cloud provider's (AWS) disk encryption standards."

## 3. Data Residency (The "Canada" Question)
*   **The Expectation:** "Does my customer data leave Canada?"
*   **Our Current State:**
    *   ❌ **No Data Residency Guarantee.**
    *   Supabase & Vapi/OpenAI primarily process data in US regions (us-east-1, etc.).
*   **Risk Level:**
    *   **Retail:** Generally Standard/Acceptable.
    *   **Gov/Health:** Blocker.
*   **Recommended Response:** "We utilize top-tier North American cloud infrastructure (AWS/OpenAI) to ensure maximum reliability and intelligence. We comply with PIPEDA guidelines regarding the protection of personal information, regardless of processing location."

## 4. Disaster Recovery (DR) & Business Continuity
*   **The Expectation:** "If your main database region goes down, how fast are you back up?"
*   **Our Current State:**
    *   ✅ Daily Backups (via Supabase).
    *   ❌ No automated/tested failover to a secondary region.
*   **Risk Level:** Low (Supabase durability is high).
*   **Recommended Response:** "We rely on daily encrypted point-in-time recovery backups and the inherent redundancy of our cloud provider's availability zones."

## 5. Vulnerability Scanning / Pen Testing
*   **The Expectation:** "When was your last 3rd-party penetration test?"
*   **Our Current State:** None.
*   **Risk Level:** Medium (Enterprises often ask for a Pen Test report).
*   **Recommended Response:** "As an early-stage partner, we rely on the security audits of our underlying infrastructure providers. We are happy to undergo a client-sponsored penetration test if required."
