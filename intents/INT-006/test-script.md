---
intent: INT-006
phase: 1
proof_hash: d52d96351ab8
authored: 2026-09-30
---

# INT-006 — Test script

**Intent:** Patient portal + onboarding wizard with async HIC prefill
**Phase:** 1 · **Source intent:** `intents/INT-006/intent.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-006-C1 | Onboarding__c object exists with per-step staging fields (build target) | org-probe: `object-exists(Onboarding__c)`, `field-exists(Onboarding__c.Step__c)`, `field-exists(Onboarding__c.Payload_JSON__c)`, `field-exists(Onboarding__c.Contact__c)` | ✅ | (verify — green, 2026-09-30) |
| INT-006-C2 | HIC_Prefill_Requested__e platform event carries Contact/Onboarding correlation (guardrail 1) | org-probe: `field-exists(HIC_Prefill_Requested__e.Contact_Id__c)`, `field-exists(HIC_Prefill_Requested__e.Onboarding_Id__c)` | ✅ | (verify — green, 2026-09-30) |
| INT-006-C3 | Language_Preference__c keys localized templates (guardrail 2) | org-probe: `field-exists(Contact.Language_Preference__c)`, `field-type(Contact.Language_Preference__c, Picklist)` | ✅ | (verify — green, 2026-09-30) |
| INT-006-C4 | Onboarding_Complete__c gate exists (acceptance → INT-008 gate) | org-probe: `field-exists(Contact.Onboarding_Complete__c)`, `field-type(Contact.Onboarding_Complete__c, Checkbox)` | ✅ | (verify — green, 2026-09-30) |
| INT-006-C5 | Onboarding__c is Private (PHI-adjacent — guardrail 3) | org-probe: `sharing-model(Onboarding__c, Private)` | ✅ | (verify — green, 2026-09-30) |
| INT-006-C6 | LWR Patient Portal site with LWC wizard renders in 5 locales (acceptance) | 📋 accepted by Prashant Kumar — delivery/runbook-INT-006.md | 📋 | accepted-gap |
| INT-006-C7 | Loqate address validation callout succeeds via Named Credential (acceptance) | 📋 accepted by Prashant Kumar — delivery/runbook-INT-006.md | 📋 | accepted-gap |
| INT-006-C8 | Localized welcome email fires post-Summary (acceptance) | 👁 Manual scene A | 👁 | _pending_ |
| INT-006-C9 | Wizard entry publishes HIC prefill event without blocking UI (guardrail 1) | 👁 Manual scene B | 👁 | _pending_ |

## Manual validation scenes

### Scene A — Localized welcome email (C8)
1. Log into Patient Portal as a fresh patient with `Language_Preference__c = fr`.
2. Complete the wizard through Summary submit.
3. Confirm the welcome email received is the French template, not English.

### Scene B — Non-blocking HIC prefill (C9)
1. Open the wizard's first step; disconnect the org's HIC named credential (or point it at a slow mock).
2. Verify the wizard's Identity step renders and accepts input within 2s.
3. Confirm `HIC_Prefill_Requested__e` fired (Debug Logs / Event Monitor) and the UI never awaited it.

## Deliberately not tested (out of scope)
- The HIC integration itself (INT-004 owns; this intent only publishes the event).
- Cleartext insurance persisted on Contact — prevented by design (Payload_JSON__c holds only wizard step data; insurance detail is submitted onward to encrypted MHE per INT-004).
