# INT-012 — Deployment runbook

**Intent:** `intents/INT-012/intent.md` · **Design:** `intents/INT-012/design.md` · **Test script:** `intents/INT-012/test-script.md` · **Escalation-channel decision:** `decisions/2026-09-30-INT-012-escalation-channel.md`

## Prerequisites

- **INT-011 ✅** — `Assessment__c` object exists.
- **INT-005 ✅** — role hierarchy (used by the follow-on that flips Task owner to the practitioner's Team Manager).

## Metadata deploy (single pass)

```bash
sf project deploy start \
  --source-dir force-app/main/default/objects/Assessment__c \
  --source-dir force-app/main/default/flows/Assessment_15_Day_Escalation.flow-meta.xml \
  --target-org <alias>
```

**Verified:** `0AfoB000000ypvhSAA` clean on `epic.out.e68d765f4115@orgfarm.salesforce.com` — 2026-09-30.

**Components:** 3 CustomFields (`Assigned_Date__c` formula, `Escalated__c`, `Escalated_Date__c`) + 1 Scheduled Flow (`Assessment_15_Day_Escalation`, daily 02:00 UTC).

## Setup steps

None. Flow activates on deploy; scheduled trigger fires nightly at 02:00 UTC starting 2026-10-01.

## How it works

1. 02:00 UTC daily, `Assessment_15_Day_Escalation` queries `Assessment__c` where `Status__c = 'Pending Review'` AND `Escalated__c = false` AND `Assigned_Date__c < TODAY - 15`.
2. For each match: create a Task (`WhatId = Assessment.Id`, `OwnerId = Assessment.OwnerId`, `Priority = High`, subject "Escalation — Assessment pending > 15 days").
3. Stamp `Escalated__c = true`, `Escalated_Date__c = TODAY` on the assessment.
4. Rerunning tomorrow can't double-escalate — the `Escalated__c = false` filter excludes it.

## Deferred / follow-ons

- **Team Manager routing (C4)** — Task `OwnerId` today falls back to `Assessment.OwnerId`. Real routing to the practitioner's Team Manager needs (a) practitioner-user mapping and (b) Region on Assessment (INT-020). When both land, edit the Flow's `Collect_Task` assignment to resolve the manager.
- **Manual scenes A + B (C5, C6)** — 👁 _pending_; tester runs `intents/INT-012/test-script.md`.

## Rollback

Destructive deploy: flow first (`Assessment_15_Day_Escalation`), then the three fields.
