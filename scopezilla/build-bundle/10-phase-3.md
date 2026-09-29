# Phase 3 — Practitioner Community & Assignment (PTSF Patient Travel Support)

> **Phase orchestration — what's in/out of phase, dependencies, starting state.** Read this first to orient. Per-capability buildable specs live in `11-intents-3.md` (when present) — that's what you actually build against, one intent at a time.
> Phase duration: **sequence only — no committed duration**.

## Intent

- **For:** The PTSF Practitioner Program and Regional Ops teams — the people who need the 4,000-practitioner surface online, with auto-assignment, a business-day accept-or-reassign SLA, and a digital assessment form that replaces the current PDF flow.
- **Outcome:** An application that reaches "Awaiting Practitioner" is auto-assigned within seconds to the nearest available practitioner in the treatment specialty; the practitioner accepts within 3 business days (or the assignment reassigns automatically); the practitioner completes a treatment-specific digital assessment, optionally requesting a specialist re-referral; a 15-day escalation fires to Team Managers on assessments that stall.
- **Measured by:** - End-to-end in a lower env: application submitted → practitioner selected by DISTANCE() within specialty → practitioner accepts or lapses → reassignment fires on the business-day boundary → assessment completed → 15-day escalation demoed.
- 4,000 (or the piloted subset) practitioner Contacts geocoded and enrolled as Partner Community users.
- Assignment auto-selection returns in <5 seconds for a given submission.
- Reassignment logic correctly excludes previously-declined practitioners.
- **Must not:** Build the assessor-side review console, subsidy determination, or migration. Assign a practitioner outside the patient's region. Expose Medical_History__c to a practitioner before their Assignment reaches Accepted. Use calendar days for the SLA clock.

## Pre-decided (do not re-litigate)
- Auto-assignment via Apex Queueable using SOQL DISTANCE() from patient Location__c, filtered by Practitioner_Specialty__c, On_Leave__c = false, Current_Load__c < Capacity_Max__c, excluding previously-declined practitioners.
- Business Hours per region drives the 3-business-day accept-or-reassign clock; the practitioner's region is authoritative unless Q-010-1 resolves otherwise.
- 15-day escalation is calendar days (chosen for simplicity — Q-012-1 confirms channel).
- Digital assessment is a metadata-driven LWC form, layout per Treatment_Type__c.
- Specialist re-referral spawns a child Assessment__c and a new Assignment__c via the same selection logic.

## Starting state (from Patient Journey MVP)

You should find these already deployed in the sandbox:
- **Patient Journey MVP outcome:** A patient in each of the three regions can register, complete onboarding, submit a subsidy application in their language, and see it enter the 'HIC-check pending' → 'awaiting practitioner' pipeline. Auto-reject fires when HIC indicates insurance covers travel.

## Plan-mode questions (resolve before switching to Build mode)
- **Q-009-1 (assignment tie-breakers):** distance-only will produce ties in urban regions. Tie-breaker candidates: lowest Current_Load__c, longest-since-last-assignment, or random. Ops decides.
- **Q-010-1 (business-day clock ownership):** practitioner's region, patient's region, or assessing region?
- **Q-012-1 (escalation channel):** Task (default), Case, or Chatter post?
- **Partner Community license procurement (G0101):** is the full 4,000 in scope for go-live, or a regional pilot cohort first?
- **Practitioner onboarding UX and training plan:** 4,000 external users onto a new portal in three regions is a change-management program in its own right; who owns it and by when?

## Build-mode questions (ask only if the situation arises)
- If the selection query returns zero eligible practitioners (all on leave, all at capacity), does the application queue for a manual assignment by an Assessor, or notify Ops immediately?
- If a practitioner declines with a reason, does the reason surface on the reassignment record for the next practitioner?

## Epics in scope for this phase

The phase brief is authoritative. Epics below are listed for cross-reference only — when an automation cites `(E04)`, this is what it refers to. For deeper epic narrative, see `90-epics-context.md`.

- **E04: Medical Practitioner Community & Assignment** — Partner Experience Cloud community for 4,000 external practitioners: registration, treatment-type specialties, geolocation, assignment inbox. Apex-based auto-assignment on application insert (nearest practitioner registered for the treatment type). Scheduled Flow reassigns after 3 business days if no acceptance. Business-day calendar per region.
- **E05: Digital Assessment & Escalation** — Replace the PDF-email-scan flow with an in-platform digital assessment form for practitioners. Support practitioner requests for additional specialist assessments. Escalate assessments that remain 'pending' 15 days after assignment to Team Managers.

## Build targets — orchestration summary

These sections orient the build agent on the shape of the phase. Per-capability buildable detail (Outcome, Build target, Guardrails, Out of scope, Acceptance, Open questions) lives in `11-intents-3.md` per intent. When a section below cites `INT-NNN`, look up the intent there.

### Data model
- **Contact (Practitioner)** additions: Location__c geolocation (geocoded on Address change), On_Leave__c, Capacity_Max__c, Current_Load__c (rolled up from open Assignments), Region__c.
- **Practitioner_Specialty__c** (custom junction): Practitioner__c (Contact), Treatment_Type__c.
- **Assignment__c** (custom): Subsidy_Application__c, Practitioner__c (Contact), Status__c (Assigned / Accepted / Declined / Completed / Reassigned), Assigned_Date__c, Accepted_Date__c, Declined_Reason__c, Previously_Declined_Practitioners__c (long text).
- **Assessment__c** (custom): Assignment__c, Treatment_Type__c, Status__c (Draft / Pending / Complete), Assigned_Date__c, Escalated__c, Escalated_Date__c, Parent_Assessment__c (for specialist re-referral), Attachments via ContentDocument.

### Automation
- Apex trigger on Subsidy_Application__c (Status → Awaiting Practitioner) → enqueues Queueable `AssignmentSelector`.
- `AssignmentSelector` Queueable: SOQL DISTANCE() ordered ASC, LIMIT 1, filtered as above; creates Assignment__c and notifies practitioner via Experience Cloud notification + email.
- Apex trigger on Assignment__c (Status transitions) reuses INT-004's `AssignmentSharingHandler` to grant/revoke Medical_History__Share.
- Scheduled Flow `Reassign_Lapsed_Assignments` running nightly at 01:00 local per region: matches assignments where Accepted_Date is null and Assigned_Date < TODAY minus 3 business days; sets Status = Reassigned; enqueues AssignmentSelector to pick the next candidate.
- Scheduled Flow `Escalate_Stalled_Assessments` running daily: matches Assessments where Status = Pending, Assigned_Date < TODAY - 15, Escalated__c = false; creates a Task to the Team Manager; sets Escalated__c = true.
- Rollup automation for Contact.Current_Load__c based on open Assignment__c count.

### UI & navigation
- Practitioner Community home: My Assignments (Open / In Review / Completed), specialty profile, availability toggle (On_Leave__c).
- Assignment record page: patient context (region-scoped fields only), Medical_History__c related list (visible only after Accept via INT-004), Accept / Decline actions, Assessment tile.
- Assessment LWC: metadata-driven form per Treatment_Type__c, save-draft, submit, "Request specialist assessment" action.
- Region- and language-appropriate localization on every screen.

### Security & access
- Partner Community licenses granted via the vetting queue from Phase 1's INT-003.
- Assignment__c OWD Public Read-Only with region-scoped criteria sharing (reuses INT-005) plus a manual share to the assigned practitioner via `AssignmentSharingHandler`.
- Assessment__c same pattern.
- Medical_History__c visibility strictly gated by Assignment.Status = Accepted (INT-004's rule).

### Reports & dashboards
- Ops report: applications in Awaiting Practitioner state older than 4 hours (health check on assignment latency).
- Ops report: open assignments approaching the 3-business-day boundary.
- Team Manager report: assessments escalated in the last 30 days.
- Practitioner Ops report: acceptance rate by practitioner over rolling 90 days.

### Sample data
- 50 sample practitioners (with realistic geolocation across each region), 5 specialties each on average, staged Capacity and On_Leave states.
- 20 sample applications in Awaiting Practitioner state to drive the assignment demo.
- One canned "urban tie" application (two practitioners equidistant) to demonstrate tie-breaker behavior (once Q-009-1 lands).

## Acceptance — user-outcome checks (phase-level)

Phase-level user-outcome claims a stakeholder would walk through to feel "Phase 3 is done." Run them in conversation with the user; mark `- [x]` only when the user agrees. Per-intent acceptance walkthroughs live in `11-intents-3.md`.

- [ ] A submitted application in APAC with treatment 'Oncology → Radiation Therapy' fires the trigger; within 5 seconds an Assignment__c exists on the nearest oncology-capable, on-duty APAC practitioner.
- [ ] The assigned practitioner opens their community, sees the assignment tile, accepts, and sees the patient's Medical_History__c rows on the assignment record.
- [ ] A practitioner who does not accept within 3 business days (per APAC Business Hours) has the assignment reassigned to the next candidate at the nightly Scheduled Flow run; they receive a localized notification.
- [ ] A practitioner completes a treatment-specific digital assessment; a save-draft round-trip works; submission moves the Assessment to Pending Review.
- [ ] A practitioner requests a specialist assessment; a child Assessment__c and a new Assignment__c appear on the assigned specialist's home.
- [ ] An Assessment stalled 16 days generates a Task to the Team Manager on the next Scheduled Flow run.
- [ ] The Assignment moves to Completed and the practitioner's medical-history visibility disappears.

## Acceptance — metadata-shaped checks (phase-level)

Phase-level metadata-shaped checks — queries the build agent runs against the target org without human help. Run via the Metadata skill (describe / tooling / SOQL). Per-intent acceptance is in `11-intents-3.md`.

- Contact geolocation field exists and is populated on the 50 sample practitioners.
- Assignment__c triggers `AssignmentSelector` on Subsidy_Application__c Status transition.
- Scheduled Flow `Reassign_Lapsed_Assignments` is scheduled per region and uses BusinessHours from Phase 1.
- Scheduled Flow `Escalate_Stalled_Assessments` is scheduled daily.
- OWD for Assignment__c and Assessment__c is Public Read-Only with a region-scoped sharing rule.
- No sharing rule grants Medical_History__c to Practitioner profile — only manual shares via the Apex handler.

## Out of scope for Phase 3

If you find yourself needing to build any of these, stop and surface it — it belongs to a later phase or is explicitly excluded.

_(none surfaced in gaps.json — confirm with user during plan-mode review)_

## Dependencies and risks

**Dependencies:** Phase 2 (Subsidy_Application__c exists); Phase 1 (security).

**Risks:** 4,000 external users is a material license commitment and adoption problem — practitioner onboarding UX and training plan are program risks, not just build risks. Assignment fairness rules must be resolved (G0402).

## Story citations covered in this phase

_(no user-story backlog captured for this phase)_

## Recipe boundary

When this phase is accepted, ask the user: *"Save this run as a recipe so we can repeat for Phase 4?"* The recipe should capture: the data-model decisions made above, the naming patterns confirmed in `03-glossary-and-naming.md`, and any Build-mode question resolutions that emerged.
