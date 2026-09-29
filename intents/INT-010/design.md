---
intent: INT-010
scope_hash: 2ae5cd8d9fee
authored: 2026-09-29
---

# INT-010 — Design

**Intent:** 3-business-day accept-or-reassign SLA with regional Business Hours
**Source intent:** `intents/INT-010/intent.md`

## Data model

No new objects/fields. Reuses:
- `Assignment__c.Status__c` (values include `Assigned`, `Reassigned` — INT-009 delivered)
- `Assignment__c.Assigned_Date__c` (default NOW() at insert — INT-009 delivered)
- `Assignment__c.Accepted_Date__c` (INT-009 delivered)
- `Assignment__c.Practitioner_Contact__c` → `Contact.Region__c` (INT-009 scaffold)
- `Subsidy_Application__c.Previously_Declined_Practitioners__c` LongText — semicolon-separated Contact Ids (INT-009 scaffold)
- Data records: `BusinessHours` named `PTSF_APAC_Support` / `PTSF_EMEA_Support` / `PTSF_AMER_Support` (INT-001 runbook seed)

## Sharing & security

No sharing model changes. The invocable Apex runs as `without sharing` (system context — scheduled batches need to see all Assignments regardless of the running user's shares).

## Automation approach

Standard-first fails at one specific spot: **Flow has no native BUSINESSHOURS-diff function** for schedule-triggered filters or elements. So the SLA math must live in invocable Apex, and Flow orchestrates.

- **`AssignmentSlaCheckFlow`** — schedule-triggered Flow, daily at 01:00 org time. One element: an Apex Action that calls the invocable method. No input records — the action queries directly to avoid Flow's SOQL/DML-per-loop overhead.
- **`AssignmentSlaCheckAction.checkAndReassign`** — `@InvocableMethod`, `without sharing`. For each open `Assignment__c` (Status=Assigned, Accepted_Date__c=null):
  1. Resolve the practitioner's Region via `Practitioner_Contact__c.Region__c`.
  2. Look up the matching BusinessHours record (`PTSF_<REGION>_Support`).
  3. Compute business-milliseconds elapsed since `Assigned_Date__c` via `BusinessHours.diff(bhId, assignedDt, System.now())`.
  4. If elapsed ≥ 3 business days (3 × 8h × 3,600,000 ms = 86,400,000 ms — Business Hours are 09:00–17:00 per INT-001), flip Status to `Reassigned`, append the practitioner Contact Id to `Subsidy_Application__c.Previously_Declined_Practitioners__c`, and enqueue a single-email to the practitioner User.

**Governor-limit exposure:** the Flow runs once per day, so cumulative Assignment volume matters, not per-run bursts. The action bulks in one SOQL for Assignments, one SOQL for the parent Applications, one Map<String,Id> for BusinessHours resolution (3 records total), one DML for Status flips + Application updates, one `Messaging.sendEmail` batch. Well inside limits at PTSF's expected volume (~thousands of Assignments/year, not/day).

## Alternatives considered

- **Three region-specific Scheduled Flows, each triggered at 01:00 org-time-equivalent of local 01:00.** Rejected — brittle to DST changes, and the org time zone would still be one place, not three. The single Flow + Apex approach filters by per-record region cleanly, so "01:00 local" is preserved semantically (the SLA math is against each practitioner's own BusinessHours).
- **Pure Schedulable Apex** (no Flow). Rejected — the Flow wrapper is a five-minute scaffold that keeps the "scheduled entry point" visible to admins in Setup → Flows rather than buried in Apex Scheduled Jobs, aligning with declarative-first.
- **Flow-only using formula fields with a `Business_Days_Elapsed__c` formula.** Rejected — a formula can't reference BusinessHours; the platform offers `BUSINESSHOURS_DIFF()` only in workflow rules / process builder, not in formula fields on custom objects.

## Neighboring & future scope

**BUILT ON:**
- INT-001 ✅ (BusinessHours seed).
- INT-009 ✅ (Assignment__c, Subsidy_Application__c, Contact.Region__c, Previously_Declined_Practitioners__c).

**BUILDS ON THIS:**
- **INT-012** (15-day escalation) — out_of_scope 1 explicitly. INT-012 owns escalation, not reassignment; it will read the same `Assigned_Date__c` clock.
- **AssignmentSelector Queueable** (INT-009 C6-C8, deferred). When built, the "enqueue AssignmentSelector to pick the next candidate" step of the build target activates. Until then, `Reassigned` means the Application enters a `Manual_Assignment_Required` state that an Assessor picks up. Documented in runbook.

**Existing org (brownfield):** all prerequisites present in `force-app/**`. No collisions.

## Open design questions

- **Q-010-1** (from intent): whose Business Hours drive the clock? **Working answer:** the practitioner's region — the Build target explicitly says *"per the practitioner's Region Business Hours"* and the email destination is the practitioner, so the practitioner's region is the load-bearing choice. Recorded as a decision.
- **Q-design-1:** localized email. The intent asks for a "localized 'assignment reassigned' email". Implementing per-locale email templates is out-of-scope for this intent (Email Template metadata + language variants belong to a communications-hardening pass). **Working answer:** ship the English email now; a follow-on intent adds locale variants keyed by `User.LanguageLocaleKey`. Flagged in runbook, no gate.
- **Q-design-2:** AssignmentSelector enqueue. Deferred until INT-009 C6-C8 land. Reassigned assignments enter a manual-pickup state (Application.Status → `Manual_Assignment_Required`). Documented.
