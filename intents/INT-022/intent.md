---
id: INT-022
phase: 3
epic: E01
confidence: Draft
origin: engagement
title: PTSF unified application — end-to-end patient subsidy lifecycle UI
---

# INT-022 — PTSF unified application

## Outcome
A sysadmin or demo user can log in, open the **PTSF Patient Travel Support** app, and walk the full patient journey end to end: onboard a patient, submit a Subsidy Application for them, see it in an Assessor list, approve it, assign a Practitioner, and watch the status move from Draft → Approved → Assigned — all from one Lightning app with real tabs and record pages, not a scatter of standalone objects.

## Build target
Ship the "working application" surface:
- A **Lightning App** `PTSF_Patient_Travel_Support` (standard nav) whose tabs cover the business journey: Patient Onboarding (the AppPage), Contacts (patients), Subsidy Applications, Assignments, Integration Errors.
- **Custom tabs** for `Onboarding__c`, `Assignment__c`, `Integration_Error__c` (the three objects that have none today).
- A **`SubsidyApplicationService`** Apex class exposing `submit`, `approve`, `reject`, `assignPractitioner` — a single service governing state transitions on `Status__c`.
- An **`applicationActions`** LWC on the Subsidy Application record page: shows the current status, offers the next-valid action buttons (Submit · Approve · Reject · Assign Practitioner), calls the service.
- A **Lightning record page** for Subsidy Application with the LWC on the right rail.
- The **`Patient_Portal_Access`** perm set extended so the demo user has read/edit on Subsidy Application, Assignment, and the new tabs/classes.

## Guardrails
- Status transitions flow through `SubsidyApplicationService` only — the LWC never writes `Status__c` directly. Illegal transitions (Approve on Rejected) throw `AuraHandledException`.
- `Approve` requires a non-null `Approved_Amount__c`; `Reject` requires a `Rejection_Reason__c`.
- `Assign Practitioner` creates one `Assignment__c` (Status = Assigned, Assigned_Date = today) and flips the application to `Awaiting_Practitioner` → `Assigned`. Re-running when an open assignment already exists is a no-op (idempotent).
- The service is `with sharing` and all queries respect FLS of the running user — no `WITHOUT SHARING` escape.
- Medical History remains invisible on every surface the app exposes (INT-004 is still the law).

## Out of scope
- Patient-facing self-service portal (Experience Cloud site) — INT-005 territory; the demo uses the sysadmin internal app.
- Real email notifications on approve/reject — the service writes status; downstream email is a separate intent.
- Payment / disbursement — approval sets the amount; no money moves.
- Multi-step approvals / Flow-driven routing — a single Approve action, no queue.

## Acceptance
Given a patient Contact that has completed the Patient Portal wizard, when the sysadmin opens the PTSF app and creates a Subsidy Application for that Contact, the record page shows `applicationActions` with a **Submit** button. Clicking Submit flips `Status__c` to `Submitted` and the button changes to **Approve / Reject**. Clicking **Approve** (after filling `Approved_Amount__c`) flips the status to `Approved`. **Assign Practitioner** then creates an `Assignment__c` row linked to the application, and the application moves to `Assigned`. A **Reject** path at the Submitted step requires a `Rejection_Reason__c` and lands on `Rejected`. Illegal transitions (Approve without an amount, Approve on Rejected) throw a user-visible toast.

## Success criteria
- SC-1: From Draft, the only visible action is Submit; Approve/Reject appear only after Submitted.
- SC-2: Approve with null `Approved_Amount__c` throws and leaves `Status__c` unchanged.
- SC-3: Assign Practitioner creates exactly one `Assignment__c` row with `Status__c='Assigned'` and `Assigned_Date__c=today`; a second call with an already-open assignment creates no duplicate.
- SC-4: The PTSF app tabs expose patient Contacts, Onboarding, Subsidy Applications, Assignments, and Integration Errors — no object the demo flow touches is unreachable from navigation.

## Dependencies

### Internal
- INT-006 — Onboarding wizard (provides the first step of the journey)
- INT-013 — Assessor console foundation (we extend, not replace, the Application_Review app concept)
- INT-021 — HIC prefill (provides Integration_Error__c for the error tab)

### External
_none_

## Open questions
- Q-022-1: Does the demo flow need a seed data button, or do we rely on the existing 16 patient Contacts?
- Q-022-2: Should Reject offer a free-text reason or a restricted picklist? (Starting with free text.)
