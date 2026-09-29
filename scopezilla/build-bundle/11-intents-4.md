# Intent Statements — Phase 4 (PTSF Patient Travel Support)

> Reference role: the **load-bearing build target** for Phase 4. Each intent below is one capability — one firing trigger or user action, one outcome, one walkthrough. Build one at a time. The phase brief (`10-phase-4.md`) is orchestration; this file is what to build.
>
> **For architects:** walk these with the customer to assign priority and answer open questions. Edit `data/intents.json` (canonical) or this file directly — the next quantum-leap run re-renders from JSON.

## INT-013 — Assessor Service Console for application review

epic `E06` · priority _(unassigned)_ · confidence _Confirmed_ · surface `console`

### 1. Outcome

An Assessor works a subsidy application end-to-end in a Service Console app that shows everything relevant except medical history.

### 2. Build target

- Service Console app 'Application Review' with Subsidy_Application__c as primary tab
- Related lists: Assessment(s), HIC_Check(s), Practitioner info (Contact card)
- Medical_History__c intentionally NOT shown (INT-004's Restriction Rule enforces)
- Utility bar with a 'Determine Subsidy' launcher (INT-014) and 'Escalate to Manager' action
- List views for My Queue, Regional Queue, SLA Breached

### 3. Guardrails

- Must not expose Medical_History__c anywhere in this console — no related list, no lookup, no report
- Must not surface an application from a different region on a Regional Ops list view

### 4. Out of scope

- Must not build the determination Flow (INT-014 owns it)
- Must not build managerial approval routing (INT-015 owns it)

### 5. Acceptance

An APAC Assessor opens the console, sees My Queue with only APAC applications, opens one, sees the Assessment and HIC_Check tiles, tries to reach medical history — nothing exists in the UI to reach it — and clicks Determine Subsidy to launch INT-014.

### Open questions

_(no open questions captured)_

---

## INT-014 — Subsidy determination Flow with regional threshold approval

epic `E06` · priority _(unassigned)_ · confidence _Assumed_ · surface `screen-flow`

### 1. Outcome

The Assessor uses a decision-support tool that proposes a subsidy amount from distance × transport type; if the amount exceeds a regional threshold, an Approval Process routes it to a Team Manager.

### 2. Build target

- Subsidy_Determination_Rule__c custom object holding transport-type multipliers per region
- Screen Flow 'Determine Subsidy' invoked from INT-013's utility bar; computes proposed amount from Practitioner.Distance_From_Patient × Transport_Type multiplier
- Assessor can adjust the amount with a reason field
- Approval Process: if Amount > Region.Threshold__c, route to Team Manager (role hierarchy)
- Subsidy_Application__c fields: Proposed_Amount__c, Approved_Amount__c, Adjustment_Reason__c

### 3. Guardrails

- Must not commit a subsidy amount that skips the approval process where required
- Must not use a global threshold — Region.Threshold__c drives it

### 4. Out of scope

- Must not integrate to a payment system (G0603 unresolved)

### 5. Acceptance

An Assessor in EMEA determines a subsidy of €1,800 (threshold €1,500); the Approval Process routes to the EMEA Team Manager, who approves; the application moves to Approved with Approved_Amount__c populated.

### Open questions

- [ ] **Q-014-1** — Is the decision-support mechanism a business rule engine, this Flow-based calculator, or a reference-table lookup? (Resolver: PTSF Program Sponsor + IA)

---

## INT-015 — Chat, deflection bot, and knowledge base on both surfaces

epic `E07` · priority _(unassigned)_ · confidence _Assumed_ · surface `experience-cloud`

### 1. Outcome

Patients and practitioners can chat with an Einstein Bot that answers most questions; live handoff to an Assessor happens on intent or user request.

### 2. Build target

- Messaging for In-App/Web widget embedded on Patient Portal and Practitioner Community
- Einstein Bot answering the top intents from the current static-website FAQ
- Omni-Channel routing on handoff, keyed by Language and Region as skills
- Knowledge base seeded from the current static-website FAQ content, per language

### 3. Guardrails

- Must not route a patient chat to an Assessor in a different region unless no in-region agent is available
- Must not surface medical-history references in bot responses

### 4. Out of scope

- Must not build voice channel — chat only

### 5. Acceptance

A French-speaking patient opens chat on the EMEA portal, the bot answers three FAQ intents, then the patient asks about a specific application; the bot routes to Omni-Channel and lands with a French-speaking EMEA Assessor.

### Open questions

_(no open questions captured)_

---

## INT-016 — Operational and executive reporting

epic `E11` · priority _(unassigned)_ · confidence _Assumed_ · surface `console`

### 1. Outcome

Assessors, managers, and executives see the operational and cycle-time metrics they need without any medical-history leakage.

### 2. Build target

- Assessor dashboard: My Queue, SLA breaches, applications-in-flight by status
- Team Manager dashboard: regional throughput, escalation count, practitioner acceptance rate
- Executive dashboard (CRM Analytics if standard reports hit LDV): subsidies granted per region, rejection reasons, cycle time
- All reports run against region-scoped rows; med-history-derived fields are excluded from any internal-facing report

### 3. Guardrails

- Must not surface any Medical_History__c field, count, or derived metric on an internal report
- Must not aggregate across regions on a Regional Ops dashboard

### 4. Out of scope

- Must not build patient-facing analytics

### 5. Acceptance

An APAC Regional Ops Manager opens their dashboard, sees 200 in-flight APAC applications, a 5% SLA breach count, and no data leaks across into EMEA or AMER.

### Open questions

_(no open questions captured)_

