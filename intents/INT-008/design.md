---
intent: INT-008
scope_hash: eebdfaf09a89
authored: 2026-09-30
---

# INT-008 — Design

**Intent:** Subsidy application lifecycle with treatment picker and auto-reject
**Source intent:** `intents/INT-008/intent.md`

## Data model

Extends existing `Subsidy_Application__c` (from INT-009's scope; already carries `Patient__c`, `Previously_Declined_Practitioners__c`, `Status__c`, `Treatment_Type__c`):

- **`Status__c`** — extend the restricted picklist with three new values: `Approved`, `Rejected`, `Assessment`. Existing values remain (`Draft`, `Submitted`, `Awaiting_Insurance_Check`, `Awaiting_Practitioner`, `Assigned`, `In_Progress`, `Completed`, `Manual_Assignment_Required`).
- **`Medical_History_Snapshot__c`** (new LongTextArea, 32k) — point-in-time snapshot of the patient's Medical_History__c rows, populated by the on-submit flow. Locked from patient edit via FLS + validation rule.
- **`Rejection_Reason__c`** (new LongTextArea, 4k) — the plain-language reason stamped by the auto-reject flow when HIC returns "covered by insurance". Read-only to patient personas.
- **`Submitted_At__c`** (new DateTime, read-only) — stamp used by the "no edit after submission" guardrail and by SLA calculations (INT-010's follow-on).

No new object. `Treatment_Type__c` already exists (INT-009 scope) and is referenced as a lookup on the application.

## Sharing & security

- No new OWD changes. `Subsidy_Application__c` sharing stays as set by INT-009 (Public Read/Write today; INT-020 will tighten to Private + region rules).
- The new fields inherit the object's OWD. FLS: readable on `Assessor_Base` and `Regional_Ops_Manager_Base`; not exposed to patient community personas in this intent (that's INT-006's page-layout job).
- `Medical_History_Snapshot__c` is a **decoupled copy**, not a live join — INT-004's Restriction Rule on `Medical_History__c` still governs live rows; the snapshot is a submission-time record the assessor sees on the application. Recorded as a design accept in INT-004's design (already ships).

## Automation approach

Three declarative Flows — no Apex.

**1. `Subsidy_Application_On_Submit`** (record-triggered, after-save, on `Status__c` change from `Draft` → `Submitted`):
- Query the patient's `Medical_History__c` rows.
- Concatenate a compact snapshot (Notes__c + created date per row) into `Medical_History_Snapshot__c`.
- Stamp `Submitted_At__c = NOW()`.
- Publish a `HIC_Entitlement_Requested__e` platform event with `Source_Object__c = 'Subsidy_Application__c'`, `Source_Record_Id__c = Id`, `Idempotency_Key__c = Id + '-' + LastModifiedDate.getTime()`.
- Update the record's `Status__c` to `Awaiting_Insurance_Check`.

**2. `Subsidy_Application_On_HIC_Complete`** (platform-event-triggered, subscribes to `HIC_Entitlement_Completed__e`):
- Filter events where `Source_Object__c = 'Subsidy_Application__c'`.
- Get the `Subsidy_Application__c` by `Source_Record_Id__c`.
- If event `Status__c = 'Covered'`: set application `Status__c = 'Rejected'`, `Rejection_Reason__c = <localized reason>`, and fire the `Subsidy_Application_Rejected` Email Alert.
- Else (any other value — `Not_Covered`, `Failed`, unknown): set `Status__c = 'Awaiting_Practitioner'` (INT-009's assignment automation picks up from here).

**3. Validation rule `Subsidy_Application.Locked_After_Submission`** — enforces guardrail 2 (no edit after submission). Blocks changes to `Patient__c`, `Treatment_Type__c`, and `Previously_Declined_Practitioners__c` when `ISCHANGED(field)` and the record was already `Submitted` or beyond. Status transitions (`Submitted` → `Awaiting_Insurance_Check` → ...) are allowed because they're driven by the flows and Status isn't in the locked-fields list.

**Email:** the Rejected-branch Flow calls Send Email directly (Flow's `emailSimple` action) with inline English subject/body and recipient = `Patient__r.Email`. A separate Classic template + Workflow Alert is deferred — INT-006 owns localization (`Must not send unlocalized emails — every template exists in every supported language`) and will land the localized template set + alert as a metadata edit; the flow's Send Email action swaps to reference the alert when INT-006 delivers.

## Integration (if any)

None new. Rides INT-007's `HIC_Entitlement_Requested__e` / `HIC_Entitlement_Completed__e` platform-event pair; the outbound side of that pair (calling the actual HIC endpoint) is already delivered by INT-007's request-side flow. This intent is the *first subscriber* to `HIC_Entitlement_Completed__e` — that pair had no subscriber before.

## Alternatives considered

- **Apex trigger for the submit + PE handling.** Rejected — Flow handles this cleanly, is admin-maintainable per AGENTS.md's standard-first bar, and doesn't need governor-limit-sensitive bulk pathways (an application submit is a single-record operation and the PE handler processes one event per subsidy app).
- **Screen Flow for the treatment picker + patient wizard.** Rejected *for this intent* — a patient-facing screen belongs on the Patient Portal (INT-006). Assessors don't need a picker (they see the existing lookup on the record). Explicitly 📋'd to INT-006.
- **`Onboarding_Complete__c` gate as a validation rule here.** Deferred — the field lives on `Contact` and is INT-006's build target. When INT-006 lands, add a `Locked_Until_Onboarding_Complete` VR to Subsidy_Application__c blocking `Status__c = 'Submitted'` unless `Patient__r.Onboarding_Complete__c = TRUE`. Tracked as 📋 in the test script; guardrail 1 is 📋 accepted → INT-006.

## Neighboring & future scope

**BUILT ON (delivered):** INT-004 (Medical_History Restriction Rule — the snapshot decouples from that source cleanly), INT-007 (HIC platform-event pair — this intent is the first `HIC_Entitlement_Completed__e` subscriber), INT-009 (Subsidy_Application__c + Treatment_Type__c exist), INT-013 (the Application Review console — the new fields and status transitions become visible there immediately with no metadata edit; existing FlexiPage relies on `getRecord` defaults, so new fields surface via the record layout).

**BUILDS ON THIS (forward cone):**
- **INT-006** — Patient Portal: adds the treatment picker screen, the localized wizard, the Onboarding_Complete__c gate on Contact, and the localized rejection email templates. The 📋 gaps in this intent's test script accept into INT-006.
- **INT-010** — practitioner assignment kicks off when Status hits `Awaiting_Practitioner`; this intent produces that transition.
- **INT-014** — Determine Subsidy Flow reads `Status__c = 'Assessment'` (or later) as its entry gate.
- **INT-020** — adds `Region__c` to `Subsidy_Application__c`; the on-submit flow adds a step to stamp it from `Patient__r.Region__c` when INT-020 delivers.
- **INT-001 design record** — selective indexes on Status + Region + Created_Date are a Support-case ask; not addressable in the capstone org, tracked there.

**PRESENT IN ORG:** `Subsidy_Application__c` and its four existing fields (INT-009). No collision — the three new fields have distinct names; the Status picklist extension adds values, doesn't rename. Only one flow exists today (`AssignmentSlaCheckFlow` — INT-010's SLA check); no collision.

## Build sequence

Standard cascade — deploys in one pass:

1. Status picklist value extension + three new fields on `Subsidy_Application__c`.
2. Email template + Email Alert.
3. Validation rule.
4. Both flows (record-triggered + PE-triggered).
5. Permission set update (`Assessor_Base` FLS on the new fields).

## Open design questions

_none_
