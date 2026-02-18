# Security, Data Privacy & Compliance Whitepaper

## Executive Summary
The CoPromote.ai platform is architected with a "Security-First" methodology, utilizing **Row-Level Security (RLS)** to enforce strict multi-tenant data isolation at the database kernel level. This document outlines the technical measures, encryption standards, and compliance frameworks implemented to protect enterprise data.

---

## 1. Data Isolation & Multi-Tenancy Architecture
Unlike traditional application-layer security (which is prone to developer error), we enforce security at the **Database Layer**. This provides a mathematical guarantee that one tenant cannot access another's data.

*   **Row-Level Security (RLS)**: Every database query is intercepted by the Postgres Kernel. The database checks the user's JWT (JSON Web Token) against strict policies before returning *any* data.
    *   *Policy Rule*: `auth.uid() -> user_profiles.company_id -> target_table.company_id`.
    *   *Effect*: It is physically impossible for a "Henry's" employee to query "Best Buy's" prospects, even if the application code attempts to do so.
*   **Tenant Context**: Application logic runs within a strictly scoped "Tenant Context" that isolates configuration, API keys, and logs.

## 2. Authentication & Access Control
We utilize **Supabase Auth** (built on GoTrue), a battle-tested identity provider used by Fortune 500 companies.

*   **Role-Based Access Control (RBAC)**: Granular permissions allow you to define roles (`Superadmin`, `Admin`, `Manager`, `Agent`).
    *   *Admins*: Can configure branding, billing, and integrations.
    *   *Agents*: Can only view assigned prospects and call logs.
*   **Multi-Factor Authentication (MFA)**: (Enterprise Plan) We support Time-based One-Time Passwords (TOTP) for all admin accounts to prevent credential theft.
*   **Single Sign-On (SSO)**: (Enterprise Plan) SAML 2.0 and OIDC support for integration with corporate identity providers (Okta, Azure AD, Google Workspace).

## 3. Data Encryption
Data is protected at all stages of its lifecycle.

*   **Encryption in Transit**: All data transmission between the client, the application, and the database occurs over **TLS 1.2/1.3** (Transport Layer Security) encrypted connections.
*   **Encryption at Rest**:
    *   **Database**: All data stored on disk is encrypted using **AES-256**.
    *   **Secrets**: API keys (e.g., Shopify tokens) are stored in a dedicated `integrations` table with application-level encryption or separate Vault storage.
*   **Backups**: Daily encrypted backups are stored in georedundant locations to ensure business continuity.

## 4. AI Security & Safety
Our AI Voice Engine is designed with strict guardrails to protect brand reputation and customer privacy.

*   **PII Masking**: Sensitive Personally Identifiable Information (PII) is processed ephemerally. Credit card numbers are **never** transcribed or stored.
*   **System Guardrails**: The AI operates under a strict "System Prompt" that forbids discussion of sensitive topics (politics, religion) and enforces professional conduct.
*   **Hallucination Control**: The AI is restricted to a "Knowledge Base" (your FAQ) and instructed to hand off to humans for unknown queries.

## 5. Compliance Readiness
Our infrastructure is built to support your compliance requirements.

*   **SOC 2 Type II**: Our infrastructure provider (Supabase/AWS) is SOC 2 Type II compliant.
*   **GDPR / CCPA**:
    *   *Right to be Forgotten*: We provide automated tools to permanently delete all records associated with a specific customer phone number upon request.
    *   *Data Portability*: Admins can export all company data in standard formats (JSON/CSV) at any time.
*   **Audit Logging**: (Enterprise Plan) Immutable logs track every critical action—who accessed what data, when they exported a list, and when settings were changed.

## 6. Infrastructure & Availability
*   **Serverless Edge Functions**: Logic runs on distributed edge nodes (Deno Deploy), reducing latency and isolating execution environments.
*   **DDoS Protection**: Automated mitigation against Distributed Denial of Service attacks.
*   **SLA**: We aim for 99.9% uptime with redundant failover capabilities.

---

**Contact Information**
For detailed security questionnaires or specific compliance verifications, please contact our Security Team at [rbraudy@gmail.com](mailto:rbraudy@gmail.com).
