---
intent: INT-015
scope_hash: ce2662925246
authored: 2026-09-30
---

# INT-015 — Design

**Intent:** Chat, deflection bot, and knowledge base on both surfaces
**Source intent:** `intents/INT-015/intent.md`

## Delivery posture — runbook-only intent
Every component here is Setup-authored and either license-gated (Einstein Bot, Messaging for In-App/Web, Knowledge) or content-driven (FAQ articles per language). Metadata-as-code offers no traction against these — the value is the click-through sequence and the wiring against already-delivered scope (Region, Language from INT-002; Assessor persona from INT-020).

## Component sequencing
1. Enable Messaging for In-App/Web and Digital Engagement licenses.
2. Enable Salesforce Knowledge; author `Language` field aligned to `Contact.Language_Preference__c` picklist values (from INT-006).
3. Author Einstein Bot with the top FAQ intents, one bot per language.
4. Configure Omni-Channel routing: skills = Region + Language; queue = Assessor pool per region.
5. Embed Messaging widget on Patient Portal (INT-003) and Practitioner Community (INT-003).

## Sharing & security
Knowledge articles are Public Read (patient/practitioner facing). Bot never queries `Medical_History_Entry__c` (guardrail 2 — enforced by simply not exposing that object to the bot user profile).

## Alternatives considered
- **Einstein Copilot / Agentforce** — richer but overshoots scope. FAQ deflection with Einstein Bot is the standard fit.
- **Custom LWC chat widget** — rejected; Messaging for In-App/Web ships the widget for free.

## Neighboring & future scope
- **Built on:** INT-002 (Language + Region on User); INT-003 (Contact record types + Communities); INT-020 (Assessor persona for handoff).

## Open design questions
- None. All work is Setup click-through.
