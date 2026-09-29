# Phase 2 — Patient Journey MVP (PTSF Patient Travel Support)

> **Phase orchestration — what's in/out of phase, dependencies, starting state.** Read this first to orient. Per-capability buildable specs live in `11-intents-2.md` (when present) — that's what you actually build against, one intent at a time.
> Phase duration: **sequence only — no committed duration**.

## Intent

- **For:** The PTSF Patient Experience and Integrations teams — the people who need patients to be able to register, onboard, and submit a subsidy application in their own language, with the Health Insurance Checker in the loop but never blocking.
- **Outcome:** A patient in any of the three regions can register, complete a localized onboarding wizard with async HIC prefill, and submit a subsidy application that either auto-rejects (when HIC confirms insurance covers travel) or advances to "awaiting practitioner" — all without a 15-second HIC peak ever locking their screen.
- **Measured by:** - A patient registers in each of APAC, EMEA, AMER and completes onboarding in their language.
- The HIC async pattern (Platform Event → Queueable → callback → Scheduled Flow retry) handles a mocked 14-second HIC response without blocking the wizard.
- A submitted application whose HIC returns "insurance covers travel" is auto-rejected with a localized explanation email inside 60 seconds of the HIC callback.
- A submitted application whose HIC returns "not covered" reaches Status = Awaiting Practitioner and is ready for Phase 3's assignment logic to pick up.
- **Must not:** Build any practitioner assignment logic, any digital assessment form, or any assessor-side UI. Introduce a synchronous HIC call from a Flow, LWC, or trigger. Send an email in a language other than the patient's Language_Preference__c. Let a patient submit an application before Contact.Onboarding_Complete__c is true.

## Pre-decided (do not re-litigate)
- HIC integration is asynchronous by default: Platform Event → Queueable Apex → callback writes result → completion Platform Event → Flow acts on it.
- Idempotency key on every HIC request = SHA(record_id, submitted_at); duplicate keys never create a second HIC_Check__c row.
- The wizard uses an Onboarding__c staging record for step-level persistence.
- Address validation is a synchronous callout (Loqate strawman) — sub-second, so blocking is fine.
- Auto-reject on HIC "covered by insurance" fires a localized explanation email; the patient never sees a raw HIC payload.

## Starting state (from Platform Foundation, Identity & PHI Security)

You should find these already deployed in the sandbox:
- **Platform Foundation, Identity & PHI Security outcome:** Production and lower sandboxes stood up; CI/CD flowing; internal users SSO from all three ADs; patient email/pw + Facebook login works in a lower env; Medical_History__c object exists with sharing lifecycle proven end-to-end; break-glass procedure documented and tested; Restriction Rules verified against internal admins.

## Plan-mode questions (resolve before switching to Build mode)
- **Q-007-1 (HIC contract):** what is the exact request/response payload schema and rate-limit contract? The Queueable's mapping and retry policy depend on this.
- **HIC SLA (p50/p99):** is 15 seconds the 99th percentile or the peak? The Scheduled Flow retry cadence should be tuned to real distribution, not the worst case only.
- **Address validator vendor (G0102):** Loqate is the strawman; is that the contracted vendor?
- **Treatment picker structure (G0201):** hierarchical picklist, custom object hierarchy, or metadata-driven picker component? 500+ leaves informs the UI choice.
- **Language coverage in year one:** which of the three regions' languages are supported at go-live, and what is the fallback for a Language_Preference__c that lacks a template?

## Build-mode questions (ask only if the situation arises)
- If HIC returns a payload the mapping doesn't recognize, do we auto-reject (safe default) or move to "manual review"?
- If Loqate returns "address unresolvable," does the wizard block or accept the entered address with a flag?
- If the patient logs out mid-wizard, does the Onboarding__c row expire? After how long?

## Epics in scope for this phase

The phase brief is authoritative. Epics below are listed for cross-reference only — when an automation cites `(E04)`, this is what it refers to. For deeper epic narrative, see `90-epics-context.md`.

- **E01: Patient Onboarding & Portal** — Public-facing patient registration (email/password + Facebook), first-login onboarding wizard capturing personal profile, HIC-prefill, address validation, gated access to subsidy applications until profile complete, localized welcome email in preferred language. Delivered on Experience Cloud (LWR).
- **E02: Subsidy Application Lifecycle** — End-to-end application object model and lifecycle: create/edit application, treatment-type selection (500+), reason capture, medical-history re-verification, submission, status tracking, patient-side visibility. Feeds practitioner assignment (E04) and assessor review (E06).
- **E03: Health Insurance Checker Integration** — Asynchronous integration with the global HIC API (Platform Event / Queueable Apex). Prefill onboarding, verify entitlements at application submission, auto-reject applications where the HIC indicates travel is covered. Handles up-to-15s peak latency without blocking UI; retry, timeout, and idempotency policy.
- **E13: Localization & Regional Configuration** — Translation Workbench for UI labels, patient-preference-driven email templates, per-region business-day calendars, per-region satellite-office data model, language-preference propagation to chat routing.

## Build targets — orchestration summary

These sections orient the build agent on the shape of the phase. Per-capability buildable detail (Outcome, Build target, Guardrails, Out of scope, Acceptance, Open questions) lives in `11-intents-2.md` per intent. When a section below cites `INT-NNN`, look up the intent there.

### Data model
- **Onboarding__c** (custom, staging): Contact__c, Step__c, Language_Preference__c, Address_Raw__c, Address_Validated__c, Insurance_Details__c (encrypted), Status__c (In Progress / Complete).
- **Subsidy_Application__c** (custom): Patient__c (Contact), Region__c, Treatment_Type__c, Reason__c, Status__c (Draft / Submitted / HIC-check pending / Awaiting Practitioner / Assessment / Approved / Rejected), Auto_Reject_Reason__c, Region-scoped OWD.
- **HIC_Check__c** (custom): Source_Record_Id__c, Idempotency_Key__c (unique), Status__c (Pending / Complete / Failed), Result_Payload__c, Attempts__c.
- **Treatment_Type__c** (custom, hierarchical): Name, Parent_Treatment_Type__c, Specialty_Tag__c. Seeded from the 500+ list.
- **Medical_History__c**: snapshot mechanism captures a version at Subsidy_Application__c submission time (child link with Snapshot_Of__c and Snapshot_At__c).

### Automation
- Platform Events: `HIC_Prefill_Requested__e`, `HIC_Entitlement_Requested__e`, `HIC_Prefill_Completed__e`, `HIC_Entitlement_Completed__e`.
- Apex Queueable `HICQueueable`: Named Credential callout, 20s timeout, exponential backoff up to 3 attempts, on final failure writes HIC_Check__c.Status = Pending for the Scheduled Flow to retry.
- Scheduled Flow: retries HIC_Check__c rows in Pending state hourly for 24 hours, then flips to Failed and notifies Ops.
- On-submit Record-Triggered Flow on Subsidy_Application__c: gate on Contact.Onboarding_Complete__c, fire `HIC_Entitlement_Requested__e`, move Status to HIC-check pending.
- On `HIC_Entitlement_Completed__e`: if covered → auto-reject Flow generates a localized email and sets Status = Rejected. Else → Status = Awaiting Practitioner.
- Email Template set per language keyed by Contact.Language_Preference__c.

### UI & navigation
- Experience Cloud LWR site "Patient Portal" with per-region localized templates.
- LWC wizard: Step 1 Identity, Step 2 Address (with Loqate), Step 3 Language, Step 4 Insurance (async HIC prefill), Step 5 Review.
- The wizard displays a non-blocking "checking coverage" pill while HIC is pending; the user can advance without waiting.
- Application form (post-onboarding): treatment picker, reason, medical-history snapshot preview, submit.
- Localized post-submission screen showing status.

### Security & access
- Reuses INT-004 and INT-005 from Phase 1 — no new sharing rules.
- Medical_History__c snapshot inherits Phase 1's OWD Private; no visibility change for patient or internal users.
- Insurance_Details__c on Onboarding__c is Shield-encrypted (deterministic if searchable, else probabilistic).

### Reports & dashboards
- Ops report: HIC_Check__c rows in Pending state older than 6 hours.
- Ops report: applications in HIC-check pending state older than 2 hours.
- Volume report: applications submitted by region by day.

### Sample data
- 15 sample patients (5 per region) with completed onboarding.
- Mock HIC endpoint returning three canned responses: (a) covers travel → auto-reject path, (b) does not cover → proceed path, (c) 14-second delay → async proof.
- 500-leaf sample Treatment_Type__c hierarchy loaded via Bulk API.

### Data sources

- **HIC API** — Named Credential; contract SLA and payload per Q-007-1. Fallback: Scheduled Flow retry for 24h; then Failed and Ops notified.
- **Loqate** (or contracted address validator) — synchronous callout; graceful degrade to raw address with a flag on unresolvable.

## Acceptance — user-outcome checks (phase-level)

Phase-level user-outcome claims a stakeholder would walk through to feel "Phase 2 is done." Run them in conversation with the user; mark `- [x]` only when the user agrees. Per-intent acceptance walkthroughs live in `11-intents-2.md`.

- [ ] A patient in Singapore registers with Facebook, completes onboarding in English, submits an application, sees the "coverage check pending" pill, and by the review step the insurance details have prefilled.
- [ ] A localized welcome email lands in the patient's inbox after onboarding.
- [ ] A submitted application in EMEA that HIC returns "covers travel" for is auto-rejected within 60 seconds; a French auto-reject email lands in the patient's inbox.
- [ ] A submitted application in AMER that HIC does not cover reaches Status = Awaiting Practitioner and is visible on the "awaiting-assignment" queue.
- [ ] A patient re-submits the same application (same idempotency key) and no second HIC_Check__c row is created.
- [ ] A 14-second mocked HIC response never freezes the wizard.

## Acceptance — metadata-shaped checks (phase-level)

Phase-level metadata-shaped checks — queries the build agent runs against the target org without human help. Run via the Metadata skill (describe / tooling / SOQL). Per-intent acceptance is in `11-intents-2.md`.

- Platform Events `HIC_*` all exist and are active.
- HICQueueable is deployed with 20s timeout and idempotency-key logic in code coverage.
- Scheduled Flow retrying pending HIC_Check__c rows is scheduled and active.
- Subsidy_Application__c OWD is Public Read-Only with a region-scoped sharing rule.
- Onboarding_Complete__c gate enforced by validation rule on Subsidy_Application__c insert.
- Email Template Folder for per-language auto-reject templates exists and has entries for every supported language.

## Out of scope for Phase 2

If you find yourself needing to build any of these, stop and surface it — it belongs to a later phase or is explicitly excluded.

_(none surfaced in gaps.json — confirm with user during plan-mode review)_

## Dependencies and risks

**Dependencies:** Phase 1 (identity, security model).

**Risks:** HIC 15s latency at peak has to be truly non-blocking to the wizard — test at scale, not just functionally. Translation Workbench coverage may lag; keep a plan for missing-language fallback.

## Story citations covered in this phase

_(no user-story backlog captured for this phase)_

## Recipe boundary

When this phase is accepted, ask the user: *"Save this run as a recipe so we can repeat for Phase 3?"* The recipe should capture: the data-model decisions made above, the naming patterns confirmed in `03-glossary-and-naming.md`, and any Build-mode question resolutions that emerged.
