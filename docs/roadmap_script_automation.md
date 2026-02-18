# Script Automation Roadmap: From Manual Entry to AI Co-Pilot

## Overview
This document outlines the evolutionary path for the Campaign Builder, moving from the current manual "Level 1" implementation to a fully automated, AI-driven "Level 3" experience.

---

## Phase 1: Level 2 - The "Template Wizard" (Structured Input)
**Goal:** Abstract the complex System Prompt into a user-friendly form. Users provide determining business logic; the system assembles the prompt.

### UI Changes (`ScriptWizard.tsx`)
Instead of one large text area, the user sees a form with these sections:

1.  **Identity & Tone**
    *   `Agent Name`: [Input] (e.g., "Claire")
    *   `Tone`: [Select] (Helpful/Polite, Assertive/Sales, Technical/Expert) -> *Maps to specific system prompt instructions.*
    *   `Pacing`: [Slider] (Slow/Deliberate <-> Fast/Conversational)

2.  **Product & Offer**
    *   `Product Name`: [Input] (e.g., "Sony A7IV")
    *   `Value Prop`: [Text Area] (Why buy this?)
    *   `Offer Details`: [Input] (e.g., "7 Days Free Warranty")
    *   `Price Anchor`: [Input] (e.g., "Repair costs $450+")

3.  **Objection Handling (The "Battle Cards")**
    *   Dynamic List of Objections (Add/Remove).
    *   `Objection`: "Time" -> `Rebuttal`: "It only takes 2 minutes."
    *   `Objection`: "Money" -> `Rebuttal`: "Cheaper than a repair."

### Backend Logic (`PromptAssembler.ts`)
A Typescript utility that takes the form data and interpolates it into a Master Template string (similar to our current SQL, but dynamic).

**Example Output:**
```text
You are {{AgentName}}. Your tone is {{Tone}}.
You are selling {{ProductName}}.
If the customer objects to {{Objection1}}, you say: {{Rebuttal1}}.
```

---

## Phase 2: Level 3 - The AI Co-Pilot (Generative Workflow)
**Goal:** A conversational interface where the user describes their needs, and an LLM writes the entire script configuration (Level 1 + Level 2 combined).

### User Flow
1.  **Chat Interface**: "I want a script for selling luxury watches..."
2.  **Generation (Draft State)**:
    *   AI writes the script but saves it with a `status = 'pending_review'`.
    *   **Nothing goes live automatically.**
3.  **Human-in-the-Loop Review**:
    *   User sees a "New AI Suggestion" alert in the Dashboard.
    *   User reviews a Side-by-Side diff of current vs. suggested script.
    *   User can manually edit the script.
    *   User clicks **"Approve & Deploy"** or **"Reject"**.
4.  **Simulation (The "Test Drive")**:
    *   User clicks "Test Call".
    *   System initiates a call to the user's phone using the *draft* script.
    *   User can make u to 10 test calls.

### Technical Requirements
1.  **Branded Caller ID (CNAM)**:
    *   **Trigger**: Provisioning and CNAM registration are initiated **the moment the user completes the "Verification Unlock"** (submitting EIN/Address).
    *   **Process**: We purchase a local number, link it to their new Twilio Trust Product, and submit the CNAM string (e.g., "Henry's Camera").
2.  **Automated Carrier Onboarding**:
    *   **Submission**: We use the Twilio Trust Hub API to programmatically submit EIN, Business Address, and Use Case details.
### The "Sandbox Guardrail" Strategy
To prevent abuse and control platform costs while providing a robust developer experience:
1.  **Strict Number Locking**: In Sandbox Mode, the system ONLY allows calls and SMS to be sent to the **User's Registered/Verified Phone Number**. 
    *   Any attempt to call a different prospect number is blocked by the UI and the Edge Function.
2.  **The "Soft Limit" & Unlock Flow**: 
    *   *Initial Tier*: 20 test interactions to prove the concept.
    *   *The "Verification Unlock"*: Instead of a paywall, the system asks: *"Need more tests? Complete your Business Profile to unlock unlimited Sandbox testing."*
    *   *Benefit*: This forces the user to provide their EIN/Address (getting the Trust Hub application started) in exchange for more freedom.
3.  **Real-time Trust Hub Trigger**: 
    *   As soon as they "Unlock," we programmatically start the Twilio Trust Hub registration.
    *   This ensures that by the time they've finished testing their 100th or 200th call, their Branded Number is likely already approved.
3.  **Library of Archetypes**: Example scripts (e.g., "The Challenger," "The White-Glove Concierge").
4.  **Data-Driven Evolution**: System tracks close rates and promotes top scripts to the reference library.
4.  **Simulation Sandbox**: A temporary storage to hold "Draft Scripts" for testing before they go live.
5.  **Feedback Loop**: Users can say "This is too aggressive," and the AI adjusts the specific sub-sections while maintaining the structural integrity.

---

## Implementation Estimates

| Feature | Complexity | Estimated Time | Key Components |
| :--- | :--- | :--- | :--- |
| **Level 2 (Wizard)** | Medium | 1 Sprint (2 Weeks) | React Forms, Template String Logic |
| **Level 3 (Co-Pilot)** | High | 2 Sprints (4 Weeks) | LLM Integration, Chat UI, Meta-Prompts |

## Immediate Next Step (For New Demo)
For now, stick to **Level 1 (Manual/SQL)** but use a "Master Template" file that you can copy-paste and just find/replace key terms (Company Name, Product) manually.
