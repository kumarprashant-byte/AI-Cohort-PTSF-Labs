---
date: 2026-09-29
intents: [INT-010]
ratifier: Prashant Kumar
---

# INT-010 Q-010-1 — SLA clock ticks against the practitioner's region BusinessHours

## Context

`intents/INT-010/intent.md` carries `Q-010-1`: whose Business Hours drive the 3-business-day SLA — the practitioner's region, the patient's region, or the org's default? Three candidates, one load-bearing pick.

## Change

Q-010-1 answered as: **the practitioner's region BusinessHours** — `PTSF_APAC_Support` / `PTSF_EMEA_Support` / `PTSF_AMER_Support` (seeded by INT-001), resolved via `Assignment__c.Practitioner_Contact__c → Contact.Region__c`.

Two independent reasons converge on the same answer:

1. The Build target in the intent explicitly reads *"per the practitioner's Region Business Hours"* — the intent already names the answer; Q-010-1 was flagged to force ratification, not to reopen it.
2. The email that fires on reassignment goes to the practitioner. The SLA measures *how long the practitioner had to accept*, so the clock should tick against the hours *they* were expected to be working.

## Consequences

- The invocable Apex `AssignmentSlaCheckAction` reads `Practitioner_Contact__c.Region__c` and maps to the region's BusinessHours record. An Assignment with a null Practitioner_Contact or a Practitioner_Contact whose Region__c is blank is skipped (defensive — a null-region Assignment cannot have its SLA computed, so no state change is safe).
- The org's default BusinessHours record is not consulted. If a fourth region were added later, the picklist and the BusinessHours record must both be added — the intent's guardrails on region enumeration cover this.
- No hashed scope fields in `intents/INT-010/intent.md` changed. Q-010-1 is now answered in-place.
