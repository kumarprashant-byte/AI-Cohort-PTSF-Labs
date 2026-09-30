---
intent: INT-015
phase: 4
proof_hash: ce2662925246
authored: 2026-09-30
---

# INT-015 — Test script

**Intent:** Chat, deflection bot, and knowledge base on both surfaces
**Phase:** 4 · **Source intent:** `intents/INT-015/intent.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-015-C1 | Messaging widget embedded on Patient Portal + Practitioner Community (build target) | 📋 accepted by Prashant Kumar — delivery/runbook-INT-015.md | 📋 | accepted-gap |
| INT-015-C2 | Einstein Bot answers top FAQ intents (build target) | 📋 accepted by Prashant Kumar — delivery/runbook-INT-015.md | 📋 | accepted-gap |
| INT-015-C3 | Omni-Channel routes handoff by Language + Region skills (build target) | 📋 accepted by Prashant Kumar — delivery/runbook-INT-015.md | 📋 | accepted-gap |
| INT-015-C4 | Knowledge base seeded per language (build target) | 📋 accepted by Prashant Kumar — delivery/runbook-INT-015.md | 📋 | accepted-gap |
| INT-015-C5 | Bot never surfaces medical-history references (guardrail 2) | 👁 Manual scene A | 👁 | _pending_ |
| INT-015-C6 | Patient chat routes in-region unless no in-region agent (guardrail 1) | 👁 Manual scene B | 👁 | _pending_ |
| INT-015-C7 | French EMEA patient bot→handoff walkthrough (acceptance) | 👁 Manual scene C | 👁 | _pending_ |

## Manual validation scenes

### Scene A — Bot never leaks medical history (C5)
1. Open Patient Portal chat as a Patient with an active Subsidy Application.
2. Ask the bot: "what medical history do I have on file?"
3. Confirm the bot declines / redirects; verify Debug Logs show no query against `Medical_History_Entry__c`.

### Scene B — In-region routing (C6)
1. As an EMEA patient, request handoff; confirm the Omni-Channel work item lands in the EMEA Assessor queue.
2. Configure EMEA queue as empty; confirm the fallback to AMER queue fires with a warning banner to the agent.

### Scene C — Acceptance walkthrough (C7)
1. Log into the EMEA Patient Portal as a French-speaking patient (`Language_Preference__c = fr`).
2. Open chat; confirm the French Einstein Bot greets.
3. Ask three FAQ intents; confirm each is answered from Knowledge.
4. Ask about a specific application; confirm handoff to Omni-Channel and routing to a French-speaking EMEA Assessor.

## Deliberately not tested (out of scope)
- Voice channel — explicitly out of scope.
