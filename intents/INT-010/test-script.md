---
intent: INT-010
phase: 3
proof_hash: 1568c9e3a28f
authored: 2026-09-29
---

# INT-010 — Test script

**Intent:** 3-business-day accept-or-reassign SLA with regional Business Hours
**Phase:** 3 · **Source intent:** `intents/INT-010/intent.md` · **Design:** `intents/INT-010/design.md`

## Criteria

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-010-C1 | An Assignment older than 3 business days (per the practitioner's Region BusinessHours) with Status=Assigned and Accepted_Date=null has its Status flipped to Reassigned by `AssignmentSlaCheckAction.checkAndReassign` (build target, acceptance) | `AssignmentSlaCheckActionTest.overdueAssignmentIsReassigned` | ✅ | (CI) |
| INT-010-C2 | An Assignment younger than 3 business days is left untouched (guardrail 1 — business days, not calendar days) | `AssignmentSlaCheckActionTest.freshAssignmentIsUntouched` | ✅ | (CI) |
| INT-010-C3 | When an Assignment is reassigned, the practitioner's Contact Id is appended to `Subsidy_Application__c.Previously_Declined_Practitioners__c` (guardrail 2 — exclude previously-declined) | `AssignmentSlaCheckActionTest.declinedPractitionerIsAppendedToApplication` | ✅ | (CI) |
| INT-010-C4 | An Assignment already in a terminal state (Accepted, Declined, Reassigned, Completed) is not re-flipped, even if past the 3-day threshold | `AssignmentSlaCheckActionTest.terminalStatusIsUntouched` | ✅ | (CI) |
| INT-010-C5 | The SLA math uses the practitioner's region BusinessHours, not the org's — an APAC assignment created Friday 16:00 APAC and evaluated Monday 09:00 APAC (weekend elapsed, ~1 business day worked) is NOT reassigned (guardrail 1 + Q-010-1 answer) | `AssignmentSlaCheckActionTest.weekendDoesNotCountAsBusinessDays` | ✅ | (CI) |
| INT-010-C6 | `AssignmentSlaCheckFlow` is deployed active as a schedule-triggered Flow, calling the invocable action daily (build target — Scheduled Flow) | org-probe (see § Org assertions) | ✅ | (verify — green, 2026-09-30) |
| INT-010-C7 | An email is sent to the practitioner User when their Assignment is reassigned (build target — email notification) | `AssignmentSlaCheckActionTest.emailSentToPractitioner` (asserts `Messaging.sendEmail` invocation count) | ✅ | (CI) |
| INT-010-C8 | End-to-end: an APAC test assignment backdated to 4 business days ago is reassigned when the Scheduled Flow fires (manually invoked from Setup); the original practitioner sees a 'reassigned' email in their inbox and the Application shows the Contact Id in Previously_Declined_Practitioners__c (acceptance) | Manual scene A | 👁 | _pending_ |

### Deliberately not tested (out of scope)

- **15-day escalation to a manager** (out_of_scope 1) — INT-012's proof plan.
- **Localized email per user LanguageLocaleKey** (Q-design-1) — deferred. English email only in this intent; locale variants belong to a follow-on.
- **Enqueuing AssignmentSelector to pick the next candidate** (Q-design-2) — INT-009 C6-C8 deferred. Reassigned assignments enter manual-pickup; the enqueue proof activates when INT-009 completes.

## Automated proofs to write

- **`AssignmentSlaCheckActionTest.overdueAssignmentIsReassigned`** — insert Contact (practitioner) with Region__c=APAC; insert Subsidy_Application__c; insert Assignment__c with Status=Assigned, Assigned_Date__c backdated 5 calendar days (spans a weekend = 3 business days), Accepted_Date__c=null; insert BusinessHours PTSF_APAC_Support; invoke `AssignmentSlaCheckAction.checkAndReassign(new List<Invocable.Empty>{new Invocable.Empty()})`; requery Assignment and assert Status='Reassigned'.
- **`AssignmentSlaCheckActionTest.freshAssignmentIsUntouched`** — same setup but Assigned_Date__c = System.now(); after action, Status still 'Assigned'.
- **`AssignmentSlaCheckActionTest.declinedPractitionerIsAppendedToApplication`** — after `overdueAssignmentIsReassigned` runs, requery Subsidy_Application__c and assert `Previously_Declined_Practitioners__c` contains the practitioner Contact's Id.
- **`AssignmentSlaCheckActionTest.terminalStatusIsUntouched`** — Assignment.Status='Completed', Assigned_Date__c backdated 10 days; after action, Status still 'Completed'.
- **`AssignmentSlaCheckActionTest.weekendDoesNotCountAsBusinessDays`** — Assigned_Date__c backdated ~2 calendar days spanning a weekend so business-hour diff < 3 days; assert Status still 'Assigned'.
- **`AssignmentSlaCheckActionTest.emailSentToPractitioner`** — use `Messaging.reserveSingleEmailCapacity(1)` and assert `Limits.getEmailInvocations()` increments by the number of reassignments.

## Org assertions

- **INT-010-C6** (Scheduled Flow deployed and active):
  - `flow-active(AssignmentSlaCheckFlow)`

## Manual validation scenes

### Scene A — End-to-end SLA reassignment (criterion C8)

1. As admin, insert a Contact `contact-apac-practitioner` with `Region__c = APAC` and provision a corresponding User (any Standard User profile) named `apac.practitioner@ptsf.test.invalid`.
2. Confirm the BusinessHours record `PTSF_APAC_Support` exists (`SELECT Id FROM BusinessHours WHERE Name = 'PTSF_APAC_Support'` returns one row); if not, run the INT-001 runbook seed.
3. Insert `Subsidy_Application__c` for a patient Contact (any).
4. Insert `Assignment__c`:
   - `Application__c` = that Application
   - `Practitioner_Contact__c` = the APAC practitioner Contact
   - `OwnerId` = `apac.practitioner@ptsf.test.invalid`
   - `Status__c = 'Assigned'`
   - `Assigned_Date__c` = 5 calendar days ago (spanning at least one weekend so business hours elapsed = ~3 days)
   - `Accepted_Date__c` = null
5. In Setup → Flows → **AssignmentSlaCheckFlow** → *Debug* → *Run*.
6. Query `SELECT Id, Status__c FROM Assignment__c WHERE Id = '<the Id>'` — expect `Status__c = 'Reassigned'`.
7. Query `SELECT Previously_Declined_Practitioners__c FROM Subsidy_Application__c WHERE Id = '<the Id>'` — expect it to contain the APAC practitioner Contact Id.
8. Check the practitioner User's inbox (or the org's Setup → Email Log Files) — expect a 'Your assignment has been reassigned' email.

**Expected:** Status flipped, Previously_Declined appended, email sent. **Sign-off:** _name / date / pass·fail_.
