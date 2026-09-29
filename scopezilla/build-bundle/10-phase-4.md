# Phase 4 — Assessor Review, Approval & Support (PTSF Patient Travel Support)

> **Phase orchestration — what's in/out of phase, dependencies, starting state.** Read this first to orient. Per-capability buildable specs live in `11-intents-4.md` (when present) — that's what you actually build against, one intent at a time.
> Phase duration: **sequence only — no committed duration**.

## Intent

- **For:** The PTSF Internal Ops team — Assessors, Team Managers, and Regional Ops Managers — who need a Service Console for reviewing applications, a decision-support tool for subsidy determination, chat + deflection on both public surfaces, and the operational and executive reporting they run the program from.
- **Outcome:** An Assessor works an application end-to-end in a Service Console without ever seeing medical history, invokes the "Determine Subsidy" Flow, submits for managerial approval where the threshold is exceeded, approves, and closes. Chat with an Einstein Bot deflection layer is live on both surfaces. Regional Ops sees a dashboard of cycle time and SLA metrics; executives see a CRM Analytics view (if standard reports hit LDV) of subsidies granted per region.
- **Measured by:** - An Assessor completes an application review-to-approval cycle end-to-end in the console.
- The determination Flow proposes an amount from distance × transport-type multipliers; Assessor can adjust with a reason.
- Amounts above the region threshold route to a Team Manager approval and land back on the record when approved.
- Chat on both surfaces routes correctly by region and language; the bot answers a defined FAQ set before handoff.
- Assessor, Manager, and Executive dashboards render with region-scoped rows and no medical-history leakage.
- **Must not:** Expose Medical_History__c anywhere in the console, on a report, or in a chat bot response. Build any patient-facing analytics. Wire a payment integration (G0603 unresolved). Aggregate across regions on a Regional Ops dashboard.

## Pre-decided (do not re-litigate)
- Service Console app "Application Review" with Subsidy_Application__c as primary tab.
- Determination is a Screen Flow calculator (subject to Q-014-1 — BRE / Flow / lookup table) with Subsidy_Determination_Rule__c holding transport-type multipliers per region.
- Approval Process routes on Amount > Region.Threshold__c to the Team Manager (role hierarchy).
- Chat is Messaging for In-App/Web with Einstein Bot deflection; Omni-Channel routes by Language + Region skills.
- Reporting starts on standard Reports + Dashboards; migrate to CRM Analytics if a tile hits LDV limits during pilot.

## Starting state (from Practitioner Community & Assignment)

You should find these already deployed in the sandbox:
- **Practitioner Community & Assignment outcome:** In a lower env: application submitted → practitioner selected by DISTANCE() within the treatment specialty → practitioner accepts or lapses → reassignment fires on business-day boundary → assessment completed digitally → 15-day escalation demoed. Partner Community license procurement complete for target rollout region(s).

## Plan-mode questions (resolve before switching to Build mode)
- **Q-014-1 (decision-support mechanism):** business rule engine, this Flow-based calculator, or a reference-table lookup?
- **Regional thresholds:** what is the exact Region.Threshold__c value in each region's currency? Legal / Finance signs off.
- **Approval hierarchy corner cases:** if a Team Manager is on leave, does the approval route to the Regional Ops Manager, or does it wait?
- **Chat channel (G0701):** Messaging for In-App/Web is the strawman; is that the contracted channel or should Digital Engagement's other channels (WhatsApp, SMS) come first?
- **Knowledge seeding:** who owns the migration of static-website FAQ content into Knowledge, per language, and by when?

## Build-mode questions (ask only if the situation arises)
- If the Assessor adjusts the proposed amount by more than X%, does the record require a mandatory reason field or a second-level review?
- If the bot doesn't understand a patient's intent in a supported language, does it hand off to any Assessor in the region or hold for a language-matched one?

## Epics in scope for this phase

The phase brief is authoritative. Epics below are listed for cross-reference only — when an automation cites `(E04)`, this is what it refers to. For deeper epic narrative, see `90-epics-context.md`.

- **E06: Application Review, Approval & Subsidy Determination** — Assessor console (Service Cloud) for reviewing applications and assessments, approving/rejecting, entering subsidy amount. Decision-support for subsidy amount based on distance and transport type. Managerial approval hierarchy for higher-value subsidies.
- **E07: Chat, Messaging & Support Deflection** — Live chat between Patients/Practitioners and PTSF Assessors. Einstein Bots + Knowledge for common-question deflection. Channel selection TBC (Messaging for In-App/Web candidate).
- **E11: Reporting & Analytics** — Operational dashboards for Assessors/Managers (applications by region/treatment, cycle times, escalations, practitioner acceptance rates). Executive KPIs for the leadership team. Volume-aware design given 1M applications/year.

## Build targets — orchestration summary

These sections orient the build agent on the shape of the phase. Per-capability buildable detail (Outcome, Build target, Guardrails, Out of scope, Acceptance, Open questions) lives in `11-intents-4.md` per intent. When a section below cites `INT-NNN`, look up the intent there.

### Data model
- **Subsidy_Application__c** additions: Proposed_Amount__c, Approved_Amount__c, Adjustment_Reason__c, Approval_Status__c.
- **Subsidy_Determination_Rule__c** (custom): Region__c, Transport_Type__c, Multiplier__c, Base_Amount__c, Threshold__c.
- **Region** — either a custom object or a picklist-plus-mdt; Threshold__c on it.
- **Knowledge__kav** — standard Knowledge, per-language variants; seeded from FAQ.

### Automation
- Screen Flow "Determine Subsidy" invoked from the console utility bar: pulls Practitioner.Distance_From_Patient × Transport_Type multiplier from Subsidy_Determination_Rule__c, proposes an amount, lets Assessor adjust with reason, submits.
- Approval Process on Subsidy_Application__c: entry criteria Amount > Region.Threshold__c, initial approver Team Manager (via role hierarchy), final approval writes Approved_Amount__c and Status = Approved.
- Einstein Bot dialog set answering the top FAQ intents per language, with a "connect to an agent" branch.
- Omni-Channel routing configuration with Language and Region as required skills.

### UI & navigation
- Service Console app "Application Review": Subsidy_Application__c primary tab, Assessment(s) related list, HIC_Check(s) related list, Practitioner card. **No Medical_History__c anywhere.**
- Utility bar: "Determine Subsidy" Flow launcher, "Escalate to Manager" action.
- List views: My Queue, Regional Queue, SLA Breached.
- Messaging widget on Patient Portal and Practitioner Community; bot deflection then live agent handoff.
- CRM Analytics dashboard (if standard doesn't scale): subsidies-per-region trend, rejection-reason breakdown, cycle-time by region.

### Security & access
- Assessor profile has field-level security preventing edits on Medical_History__c-derived fields (none exist on the exposed surface, but doubly enforced).
- Region-scoped sharing (from INT-005) continues; nothing new here.
- Team Manager role in role hierarchy above Assessor within a region.
- Knowledge__kav visibility follows Data Category by language.

### Reports & dashboards
- Assessor: My Queue, SLA breaches on my applications, applications-in-flight by status.
- Team Manager: regional throughput, escalation count, practitioner acceptance rate, pending approvals.
- Regional Ops Manager: cycle time, SLA breach %, rejection reason breakdown, subsidies granted this quarter.
- Executive (CRM Analytics if needed): subsidies-per-region, rejection-reason breakdown, cycle time, month-over-month volume.

### Sample data
- 30 sample applications spread across the states (Awaiting Practitioner, Assessment, Pending Approval, Approved, Rejected) to exercise dashboards.
- 3 sample Subsidy_Determination_Rule__c records per region × transport type.
- 20 seeded Knowledge__kav articles per language covering the FAQ.

## Acceptance — user-outcome checks (phase-level)

Phase-level user-outcome claims a stakeholder would walk through to feel "Phase 4 is done." Run them in conversation with the user; mark `- [x]` only when the user agrees. Per-intent acceptance walkthroughs live in `11-intents-4.md`.

- [ ] An APAC Assessor opens the console, sees My Queue with only APAC applications, opens one, sees the Assessment and HIC_Check tiles, confirms no way to reach medical history exists in the UI.
- [ ] The Assessor launches "Determine Subsidy," sees a proposed amount from distance × transport-type multiplier, adjusts with a reason, submits.
- [ ] A determination above threshold routes to the Team Manager and returns Approved; Approved_Amount__c is populated.
- [ ] A determination below threshold auto-approves.
- [ ] A patient opens chat on the EMEA portal in French; the bot answers three FAQ intents; on request the bot hands off to a French-speaking EMEA Assessor via Omni-Channel.
- [ ] An APAC Regional Ops Manager opens their dashboard, sees only APAC data, sees no medical-history references anywhere.

## Acceptance — metadata-shaped checks (phase-level)

Phase-level metadata-shaped checks — queries the build agent runs against the target org without human help. Run via the Metadata skill (describe / tooling / SOQL). Per-intent acceptance is in `11-intents-4.md`.

- Service Console app "Application Review" exists and lists Subsidy_Application__c as primary tab.
- No related list, list view, or lookup on the Assessor profile reaches Medical_History__c.
- Approval Process on Subsidy_Application__c is active with the threshold entry criteria.
- Einstein Bot definition is active on both Experience Cloud sites.
- Omni-Channel routing config includes Language and Region as required skills.
- Report Folder "PTSF Ops" is created and populated with the report set above.

## Out of scope for Phase 4

If you find yourself needing to build any of these, stop and surface it — it belongs to a later phase or is explicitly excluded.

_(none surfaced in gaps.json — confirm with user during plan-mode review)_

## Dependencies and risks

**Dependencies:** Phase 3 (assessments exist to review).

**Risks:** Reporting volume at 1M/year may push to CRM Analytics — decide during Phase 4 build, don't wait for the pilot.

## Story citations covered in this phase

_(no user-story backlog captured for this phase)_

## Recipe boundary

When this phase is accepted, ask the user: *"Save this run as a recipe so we can repeat for Phase 5?"* The recipe should capture: the data-model decisions made above, the naming patterns confirmed in `03-glossary-and-naming.md`, and any Build-mode question resolutions that emerged.
