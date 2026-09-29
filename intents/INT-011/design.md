---
intent: INT-011
scope_hash: e5c327e92065
authored: 2026-09-29
---

# INT-011 — Design

**Intent:** Digital assessment form with specialist re-referral
**Source intent:** `intents/INT-011/intent.md`

## Data model

- **`Assessment__c`** (new) — auto-number `ASM-{00000}`, **Private OWD**. Fields:
  - `Assignment__c` (Lookup → Assignment__c, required) — anchor for sharing.
  - `Treatment_Type__c` (Picklist: `Oncology`, `Cardiology`, `Orthopaedic`, `General`) — drives which form metadata renders.
  - `Status__c` (Picklist: `Draft`, `Pending Review`, `Approved`, `Rejected`) — default `Draft`.
  - `Response_JSON__c` (LongText, 32768) — form answers persisted as JSON keyed by field API name. LongText is deliberate: form schemas vary by treatment type, so a fixed column set would rot; storing the payload as JSON keeps the object schema stable while metadata evolves.
  - `Submitted_Date__c` (Datetime) — set when Status flips to `Pending Review`.
  - `Parent_Assessment__c` (Lookup → Assessment__c) — for specialist re-referrals (deferred; field is created now so the follow-on doesn't need a schema change).

- **`Assessment_Form__mdt`** (new Custom Metadata Type) — metadata-driven form schemas.
  - `Treatment_Type__c` (Text, unique) — join key.
  - `Schema_JSON__c` (LongText) — a JSON array of field descriptors: `[{api_name, label, type: text|textarea|number|date|checkbox|picklist, required, options?}]`.
  - One record per treatment type shipped in `force-app/main/default/customMetadata/`.

- **`ContentDocumentLink`** (standard) — attachments (imaging, prior reports) uploaded through the LWC's `lightning-file-upload`, automatically linked to the `Assessment__c`.

## Sharing & security

- **`Assessment__c` OWD: Private.**
- **Apex-managed sharing** via `AssessmentShareTrigger` on `after insert`: for each new Assessment, insert an `Assessment__Share` granting `Edit` to the OwnerId of the parent Assignment (which is the practitioner). This satisfies guardrail 1 (practitioner sees only Assessments for Assignments they own): a practitioner reassigned off an Assignment (INT-010) loses read on that Assignment and, by construction, no longer has a share on its Assessment.
- **FLS:** all fields readable/editable on the `Practitioner_Access` permission set (existing from INT-001).

## Automation approach

- **`AssessmentFormController`** (Apex, `with sharing`) — LWC controller:
  - `@AuraEnabled(cacheable=true) getFormSchema(Id assignmentId)` — returns `{ treatmentType, schema, existingAssessment }`. Reads the parent Assignment for the treatment type (via the Application), looks up the matching `Assessment_Form__mdt`, checks for a pre-existing draft Assessment on this Assignment.
  - `@AuraEnabled saveDraft(Id assignmentId, String responseJson)` — upserts an Assessment with Status=Draft.
  - `@AuraEnabled submit(Id assignmentId, String responseJson)` — upserts and flips Status→Pending Review, stamps Submitted_Date.
- **`assessmentForm` LWC** — Renders the schema dynamically (`lightning-input` variants per field type), wires save/submit buttons, hosts `lightning-file-upload` scoped to the Assessment record. Placed on the Assignment record page (community + internal) via an app-builder page assignment (manual Setup step in runbook).
- **Specialist re-referral action — DEFERRED.** The Build target names *"creates a child Assessment__c and a new Assignment__c via INT-009's logic filtered to the specialist specialty"* — INT-009's AssignmentSelector Queueable did not deliver (C6-C8 deferred). Building this half now would either mean stubbing the specialist pick (and shipping a fake) or reinventing INT-009's selector inside this intent (scope creep). Ship the assessment core; route the specialist re-referral to a follow-on that also unblocks INT-010's enqueue.

## Alternatives considered

- **Column-per-question on Assessment__c** — rejected. Every new treatment type would require a metadata change and per-treatment page layouts. The metadata-driven JSON schema keeps the object stable and puts form evolution in the admin's lane (add a `Assessment_Form__mdt` record).
- **Sharing rule based on `Practitioner_Contact__c`** — declarative sharing rules don't chain through the Assignment ownership needed here (an Assessment isn't the Assignment; a criteria-based rule can't reference the parent's Owner cleanly). Apex sharing is the smallest departure that gets the "only for their own Assignments" guardrail right.
- **Files uploaded to the Assignment instead of the Assessment** — rejected. The intent names attachments as part of the Assessment (imaging + prior reports collected during the assessment step), so link them at the Assessment level for correct lifecycle scope (an Assessment can be reopened/re-reviewed independently of the Assignment).

## Neighboring & future scope

**BUILT ON:**
- INT-009 ✅ (Assignment__c, Practitioner_Contact__c, region model).
- INT-005 ✅ (Practitioner_Access via permission-set groups).

**BUILDS ON THIS:**
- **INT-013** (assessor review console) — reads Assessments in `Pending Review` state; this build sets that state on submit, so INT-013 has its inbox on day one.
- **Specialist re-referral follow-on** — will spawn a child `Assessment__c` (Parent_Assessment__c already present on this build) and a child `Assignment__c` via the (then-built) AssignmentSelector.

**Existing org (brownfield):** no `Assessment__c` in `force-app/**`; no collision. `Assessment_Form__mdt` is a new CMT with a namespace-free API name that doesn't collide.

## Open design questions

- **Q-design-1:** community placement. The intent says "inside the community" — placement on the Experience Cloud page is a config-only step covered in the runbook (not a build artifact). Not blocking.
- **Q-design-2:** specialist re-referral spawn (deferred, described above). A follow-on intent will build it once AssignmentSelector lands.
