# Intent Statements — Phase 3 (PTSF Patient Travel Support)

> Reference role: the **load-bearing build target** for Phase 3. Each intent below is one capability — one firing trigger or user action, one outcome, one walkthrough. Build one at a time. The phase brief (`10-phase-3.md`) is orchestration; this file is what to build.
>
> **For architects:** walk these with the customer to assign priority and answer open questions. Edit `data/intents.json` (canonical) or this file directly — the next quantum-leap run re-renders from JSON.

## INT-009 — Practitioner community and geolocation-based auto-assignment

epic `E04` · priority _(unassigned)_ · confidence _Confirmed_ · surface `experience-cloud`

### 1. Outcome

When a subsidy application is not auto-rejected, the nearest available practitioner in the treatment specialty is auto-assigned within a few seconds of submission.

### 2. Build target

- Partner Community licenses provisioned for ~4,000 practitioners (subject to G0101 resolution)
- Contact geocoded on Address change (Location__c geolocation field)
- Practitioner_Specialty__c junction between Contact and Treatment_Type__c
- Assignment__c custom object with Status (Assigned / Accepted / Declined / Completed / Reassigned)
- Apex trigger on Subsidy_Application__c after HIC completion → enqueue Queueable `AssignmentSelector`
- SOQL selection by DISTANCE() from patient Location__c, filtered by specialty, On_Leave__c = false, Current_Load__c < Capacity_Max__c, excluding previously-declined practitioners
- Community record page for Assignment__c with Accept / Decline buttons and Medical_History__c related list (visible only via INT-004's sharing)

### 3. Guardrails

- Must not select a practitioner outside the patient's region (patient's Region drives BusinessHours downstream)
- Must not assign more than one open Assignment per application at a time
- Must not expose an application's Medical_History__c to a practitioner before their Assignment reaches Accepted

### 4. Out of scope

- Must not build the reassignment SLA clock (INT-010 owns it)
- Must not build the assessment form (INT-011 owns it)

### 5. Acceptance

A submitted application in APAC with treatment 'Oncology → Radiation Therapy' fires the trigger; within 5 seconds, an Assignment__c exists on the nearest oncology-capable, on-duty APAC practitioner. That practitioner opens the community, sees the assignment tile, opens it, and can see the patient's Medical_History__c rows.

### 6. Dependencies

- **Internal (build first):** INT-003, INT-008

### Open questions

- [ ] **Q-009-1** — What tie-breakers apply when two practitioners tie on distance (load, longest-since-last-assignment, random)? (Resolver: PTSF Ops leadership + IA)

---

## INT-010 — 3-business-day accept-or-reassign SLA with regional Business Hours

epic `E04` · priority _(unassigned)_ · confidence _Confirmed_ · surface `automation`

### 1. Outcome

A practitioner who doesn't accept an assignment within 3 business days for their region has the assignment automatically reassigned to the next-nearest eligible practitioner.

### 2. Build target

- Scheduled Flow running nightly at 01:00 local per region
- Query: Assignment__c where Status = Assigned AND Accepted_Date = null AND Assigned_Date < TODAY minus 3 business days (per the practitioner's Region Business Hours)
- On match: set Status = Reassigned, add practitioner to previously-declined set on the Application, enqueue AssignmentSelector (INT-009) to pick the next candidate
- Email notification to the practitioner explaining the reassignment (localized)

### 3. Guardrails

- Must not use calendar days — business days per Region Business Hours only
- Must not reassign an application without excluding the previously-declined practitioner

### 4. Out of scope

- Must not escalate to a manager here — INT-012 owns 15-day escalation

### 5. Acceptance

An assignment made in APAC at 10:00 Monday, with Region Business Hours excluding weekends and local holidays, remains unaccepted; by 01:00 the following Friday (3 business days elapsed) the Scheduled Flow reassigns it to the next candidate, and the original practitioner receives a localized 'assignment reassigned' email.

### 6. Dependencies

- **Internal (build first):** INT-009

### Open questions

- [ ] **Q-010-1** — Whose Business Hours drive the clock — the practitioner's region, the patient's region, or the assessing region? (Resolver: PTSF Ops leadership + IA)

---

## INT-011 — Digital assessment form with specialist re-referral

epic `E05` · priority _(unassigned)_ · confidence _Confirmed_ · surface `lwc`

### 1. Outcome

A practitioner completes a treatment-specific digital assessment inside the community, replacing the current PDF flow, and can spawn a specialist re-referral when needed.

### 2. Build target

- Assessment__c custom object linked to Assignment__c
- LWC Assessment component that loads a dynamic form from metadata-driven layouts keyed by Treatment_Type__c
- Save-draft support; submission moves Assessment to Pending Review
- 'Request specialist assessment' action creates a child Assessment__c and a new Assignment__c via INT-009's logic filtered to the specialist specialty
- Attachments (imaging, prior reports) uploadable and linked to Assessment__c

### 3. Guardrails

- Must not let a practitioner see or edit an Assessment for an Assignment they don't own
- Must not accept a submission without all metadata-required fields for the treatment type

### 4. Out of scope

- Must not implement the 15-day escalation (INT-012 owns it)
- Must not build the assessor review console (INT-013 owns it)

### 5. Acceptance

A practitioner with an accepted oncology assignment opens the Assessment LWC, sees the oncology-specific form, saves a draft, returns the next day, completes it, and submits. A second run: they request a specialist assessment; a child Assessment is created and a new Assignment appears on the assigned specialist's community home.

### Open questions

_(no open questions captured)_

---

## INT-012 — 15-day assessment escalation to Team Manager

epic `E05` · priority _(unassigned)_ · confidence _Assumed_ · surface `automation`

### 1. Outcome

An assessment that stays pending for 15 days from its Assigned Date is escalated to the practitioner's Team Manager so it doesn't sit forever.

### 2. Build target

- Scheduled Flow scanning Assessment__c where Status = Pending AND Assigned_Date < TODAY - 15 (calendar days)
- On match: create a Task assigned to the Team Manager (region-aware) with a link to the Assessment
- Set Assessment.Escalated__c = true and store Escalated_Date__c

### 3. Guardrails

- Must not double-escalate — check Escalated__c before creating a Task

### 4. Out of scope

- Must not build a chatter-post variant — Task is the ratified channel (subject to G0501 confirmation)

### 5. Acceptance

An Assessment created 16 days ago in Pending status is escalated on the next Scheduled Flow run: the Team Manager sees a new Task on their queue and clicking through opens the Assessment.

### Open questions

- [ ] **Q-012-1** — Escalation channel — Task, Case, or Chatter post? (Resolver: PTSF Ops leadership)

