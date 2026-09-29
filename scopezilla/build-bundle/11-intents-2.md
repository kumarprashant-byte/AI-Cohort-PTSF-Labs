# Intent Statements — Phase 2 (PTSF Patient Travel Support)

> Reference role: the **load-bearing build target** for Phase 2. Each intent below is one capability — one firing trigger or user action, one outcome, one walkthrough. Build one at a time. The phase brief (`10-phase-2.md`) is orchestration; this file is what to build.
>
> **For architects:** walk these with the customer to assign priority and answer open questions. Edit `data/intents.json` (canonical) or this file directly — the next quantum-leap run re-renders from JSON.

## INT-006 — Patient portal + onboarding wizard with async HIC prefill

epic `E01` · priority _(unassigned)_ · confidence _Confirmed_ · surface `experience-cloud`

### 1. Outcome

A new patient can register and complete a localized onboarding wizard that prefills insurance data from the HIC without ever blocking on the 15-second peak latency.

### 2. Build target

- Experience Cloud LWR site 'Patient Portal' with localized templates per region
- LWC wizard capturing name, DOB, address, language preference, insurance details
- Onboarding__c staging record persisted per wizard step
- Platform Event `HIC_Prefill_Requested__e` fired on wizard entry; UI shows a non-blocking 'checking coverage' state
- Address validation callout to Loqate (strawman) on address entry
- Localized welcome email template set, keyed by Contact.Language_Preference__c
- Contact.Onboarding_Complete__c gate that blocks the subsidy application journey until onboarding is finished

### 3. Guardrails

- Must not block wizard progression on the HIC callout returning — the wizard advances, HIC fills in later
- Must not send unlocalized emails — every template exists in every supported language
- Must not write insurance detail to a Contact field cleartext where it should live encrypted on Medical_History__c (INT-004)

### 4. Out of scope

- Must not build the subsidy application form (INT-008 owns it)
- Must not build the HIC entitlement-check pattern for submissions (INT-007 owns the shared pattern)

### 5. Acceptance

A patient in Singapore registers with Facebook, enters the wizard in English, submits an address that Loqate corrects, sees the 'coverage check pending' pill, continues to the language step, and by the time they reach the summary the insurance details have prefilled from HIC. A localized welcome email lands in their inbox.

### 6. Dependencies

- **Internal (build first):** INT-003, INT-007

### Open questions

_(no open questions captured)_

---

## INT-007 — Health Insurance Checker async integration pattern (Platform Event → Queueable → callback)

epic `E03` · priority _(unassigned)_ · confidence _Confirmed_ · surface `integration`

### 1. Outcome

Every HIC call — onboarding prefill and application entitlement check — runs asynchronously with retry, idempotency, and a hourly Scheduled Flow fallback, so a 15-second peak never blocks a user.

### 2. Build target

- Platform Event `HIC_Prefill_Requested__e` and `HIC_Entitlement_Requested__e`
- Queueable Apex `HICQueueable` calling HIC via Named Credential, 20s callout timeout, exponential backoff up to 3 attempts
- HIC_Check__c custom object linked to the source record (Onboarding__c or Subsidy_Application__c)
- Completion Platform Events (`HIC_Prefill_Completed__e`, `HIC_Entitlement_Completed__e`) with the result payload
- Scheduled Flow retrying HIC_Check__c rows in 'pending' state hourly for 24 hours
- Idempotency key `SHA(record_id, submitted_at)` on every request

### 3. Guardrails

- Must not call HIC synchronously from a Flow, LWC, or trigger — every call goes through the Queueable
- Must not exceed 3 retry attempts before deferring to the Scheduled Flow
- Must not create duplicate HIC_Check__c rows for the same idempotency key

### 4. Out of scope

- Must not decide the business rules for auto-reject (INT-008 owns the Flow that acts on the completion event)

### 5. Acceptance

A Subsidy Application is submitted with a mock HIC that takes 14 seconds; the user sees 'pending' in the wizard and can navigate away. Fourteen seconds later, HIC_Check__c is populated with the result, the completion event fires, and the application status advances. A second submission with the same idempotency key does not create a second HIC_Check__c row.

### 6. Dependencies

- **External:** Health Insurance Checker (HIC) API — Named Credential endpoint, contract SLA (p50/p99), payload schema _(owner: PTSF IT + HIC vendor)_

### Open questions

- [ ] **Q-007-1** — What is the exact HIC request/response payload schema and rate-limit contract? (Resolver: PTSF IT + HIC vendor)

---

## INT-008 — Subsidy application lifecycle with treatment picker and auto-reject

epic `E02` · priority _(unassigned)_ · confidence _Confirmed_ · surface `screen-flow`

### 1. Outcome

A patient submits a subsidy application, picks a treatment from a hierarchy of 500+ leaves, and — if HIC confirms their insurance covers travel — sees the application auto-rejected with a plain-language explanation.

### 2. Build target

- Subsidy_Application__c custom object with status state machine (Draft → Submitted → HIC-check pending → Awaiting Practitioner → Assessment → Approved/Rejected)
- Treatment_Type__c hierarchical object with a metadata-driven picker component
- Medical_History__c snapshot mechanism captured at submission time
- On-submit Flow that fires `HIC_Entitlement_Requested__e` (INT-007) and moves status to HIC-check pending
- On HIC completion: if entitlement covers travel, auto-reject Flow generates a localized explanation and emails the patient; else move to Awaiting Practitioner (INT-009 picks it up)
- Skinny table + selective indexes on Status + Region + Created_Date

### 3. Guardrails

- Must not allow submission before Contact.Onboarding_Complete__c
- Must not let a patient edit an application after submission (a corrections workflow is out of scope this phase)

### 4. Out of scope

- Must not assign a practitioner (INT-009 owns assignment)
- Must not decide subsidy amount (INT-014 owns determination)

### 5. Acceptance

A patient completes onboarding, opens a new application, picks 'Oncology → Radiation Therapy' from the hierarchical picker, submits; HIC returns 'covered by insurance' in 6 seconds; the patient sees an auto-reject screen in their language with the reason and a localized rejection email arrives.

### Open questions

_(no open questions captured)_

