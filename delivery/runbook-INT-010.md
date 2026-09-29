# INT-010 — Deployment runbook

**Intent:** `intents/INT-010/intent.md` · **Design:** `intents/INT-010/design.md` · **Test script:** `intents/INT-010/test-script.md`

## Prerequisites (must already be in the org)

- **INT-001** BusinessHours seed: records named `PTSF_APAC_Support` (Australia/Sydney), `PTSF_EMEA_Support` (Europe/London), `PTSF_AMER_Support` (America/New_York), Mon-Fri 09:00-17:00, IsActive=true. Verify:
  ```bash
  sf data query --query "SELECT Name FROM BusinessHours WHERE Name LIKE 'PTSF_%_Support'" --target-org <alias>
  ```
  Expect three rows. If missing, run the INT-001 runbook seed first.
- **INT-009** delivered: `Assignment__c`, `Subsidy_Application__c` with `Previously_Declined_Practitioners__c`, `Contact.Region__c`.

## Metadata deploy (rides the PR)

```bash
sf project deploy start \
  --source-dir force-app/main/default/classes/AssignmentSlaCheckAction.cls \
  --source-dir force-app/main/default/classes/AssignmentSlaCheckAction.cls-meta.xml \
  --source-dir force-app/main/default/classes/AssignmentSlaCheckActionTest.cls \
  --source-dir force-app/main/default/classes/AssignmentSlaCheckActionTest.cls-meta.xml \
  --source-dir force-app/main/default/flows/AssignmentSlaCheckFlow.flow-meta.xml \
  --target-org <alias> \
  --test-level RunSpecifiedTests --tests AssignmentSlaCheckActionTest
```

**3 components:** 2 ApexClass, 1 Flow.

**Verified deploy:** `0AfoB000000yj3tSAA` on `orgfarm-5f9310b41f.test2.my.pc-rnd.salesforce.com` — 2026-09-29 · tests 6/6 green.

## Setup steps (not in the metadata deploy)

### 1. Confirm the Scheduled Flow is active and scheduled

Setup → Process Automation → Flows → **Assignment SLA Check**. It deploys `Active=true` with a daily schedule starting `2026-09-30 01:00 UTC`. If the target org's business day should run against a different local time zone, edit the flow's Start element and re-save (the org time zone determines when 01:00 fires; the SLA math itself is per-practitioner-region and unaffected).

### 2. First-run verification

Immediately after deploy, run once manually to confirm the wiring end-to-end (Manual scene A in the test script):

Setup → Flows → **Assignment SLA Check** → *Debug* → *Run*. Then query for any overdue Assignments that flipped to `Reassigned`.

## Deferred / follow-ons

- **Localized email templates** (Q-design-1) — this build sends a single English body. A follow-on intent adds locale variants keyed by `User.LanguageLocaleKey`.
- **AssignmentSelector enqueue** (Q-design-2) — INT-009 C6-C8 did not deliver the Queueable. Reassigned assignments currently leave the Application without an automatic next-candidate pick; an Assessor picks it up from a manual-assignment list view (see the INT-009 runbook). Once AssignmentSelector lands, add a `System.enqueueJob(new AssignmentSelector(applicationIds))` call at the end of `AssignmentSlaCheckAction.run()`.
- **Region enumeration** — new regions require both a `Region__c` picklist value (INT-005) and a `PTSF_<REGION>_Support` BusinessHours record; the action skips Assignments whose region has no matching BusinessHours.

## Rollback

Metadata is additive. If rollback is needed:

1. Deactivate the Flow: Setup → Flows → **Assignment SLA Check** → *Deactivate*.
2. Destructive deploy:
   ```bash
   sf project deploy start --pre-destructive-changes destructiveChanges.xml \
     --manifest package-empty.xml --target-org <alias>
   ```
   `destructiveChanges.xml` lists the flow first (must be inactive), then both Apex classes.
