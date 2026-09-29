---
intent: INT-019
scope_hash: 67b23cf17f93
authored: 2026-09-29
---

# INT-019 — Design

**Intent:** Practitioner temporary access to medical history via Apex-managed sharing on Assignment__c
**Source intent:** `intents/INT-019/intent.md`

## Data model

No new custom objects. This intent operates entirely on:

- `Medical_History__c` (from INT-004) — Private OWD, lookup to Contact.
- `Medical_History__Share` — the standard auto-generated share table for a Private-OWD custom object. Salesforce creates it automatically when OWD is Private.
- `Assignment__c` (from INT-009) — `OwnerId` = the Practitioner User (per INT-009's design, settling Q-019-1).

**Custom Apex Sharing Reason** (metadata, not an object): declare `Practitioner_Assignment_Share` as an Apex Sharing Reason on `Medical_History__c`. This is a metadata setting on the object — one XML block, deployable via `force-app/main/default/objects/Medical_History__c/sharingReasons/`.

Rationale: a `RowCause = 'Manual'` share is deletable by any user with "Modify All" on the record. A **custom Apex Sharing Reason** restricts deletion to Apex only, preserving the "atomic revocation" guardrail — a Compliance Officer with break-glass access cannot accidentally leave a stale share behind by clicking Delete.

## Sharing & security

Two mechanisms, layered:

1. **`Practitioner Medical History Read` permission set** — object + FLS Read on `Medical_History__c` and all its fields (except any the classification matrix explicitly withholds; deferred to Q-004-1 from INT-004).
   - Assigned to the Practitioner Community User at provisioning (INT-003's admin-vetting Flow assigns it).
   - This is *object-level* access — the practitioner can *see* the object exists and can *query* rows they have record-level access to.
2. **Apex-managed share** — Medical_History__Share row per (record, user) pair, `AccessLevel = 'Read'`, `RowCause = 'Practitioner_Assignment_Share'`.
   - Grants *record-level* access to specific Medical_History__c rows.
   - Inserted when Assignment.Status → Accepted; deleted when it moves off.

**Restriction Rule interaction (INT-004):** INT-004's Restriction Rule filters *internal profiles*. Partner Community users aren't in that set, so the manual share works as designed — the Restriction Rule is a null constraint for the Practitioner Community persona. Verified against the design boundary INT-004 draws.

**Cascading consequences:**

- The `Practitioner Medical History Read` PS assignment is part of INT-003's practitioner-vetting flow (community-user provisioning) — cross-reference in INT-003's runbook step.
- The Medical_History__c related list on the Assignment community record page (INT-009 owns the page) renders only when both the PS and a matching share row are present. INT-009's design already assumes this.
- Audit_Log__c writes: the trigger records every insert (Manual_Share_Insert) and delete (Manual_Share_Delete) into INT-004's shared audit sink. Aligns with INT-004's Audit_Log__c ownership note.

## Automation approach

**One trigger, one class, no Flow.**

- **Trigger `AssignmentShareTrigger` on `Assignment__c` after update.**
  - Filter: rows where `Status__c` transitions to `Accepted` OR transitions off `Accepted` (to Completed / Declined / Reassigned).
  - Delegates to `AssignmentShareService.applyTransitions(List<Assignment__c> newList, Map<Id, Assignment__c> oldMap)`.

- **Class `AssignmentShareService`.**
  - `applyTransitions()`:
    - Partition Assignments into `grants` (Accepted-transition) and `revokes` (off-Accepted-transition).
    - **For grants:**
      - Query all `Medical_History__c` where `Patient__c IN :patientIds` (bulk-safe collection from the assignments).
      - Build `Medical_History__Share` rows: `ParentId = MH.Id`, `UserOrGroupId = Assignment.OwnerId`, `AccessLevel = 'Read'`, `RowCause = 'Practitioner_Assignment_Share'`.
      - **Idempotent insert:** query existing shares first (`WHERE ParentId IN :mhIds AND UserOrGroupId IN :userIds AND RowCause = 'Practitioner_Assignment_Share'`); skip pairs that already have a share.
      - `Database.insert(shares, false)` — partial-success handling; log a `Manual_Share_Insert` `Audit_Log__c` row per success.
    - **For revokes:**
      - Query matching `Medical_History__Share` rows (same triple).
      - `Database.delete(shares, false)`; log a `Manual_Share_Delete` `Audit_Log__c` row per success.
  - Bulk-safe: single SOQL per collection, single DML per collection, per invocation.
  - No recursion protection needed — the trigger doesn't re-DML Assignment__c.

**Standard-first check:**

- **Sharing rule (criteria-based)?** No criteria on Medical_History__c can express "an Assignment for this patient exists in Accepted status for this practitioner user". Sharing rules match on the record's own fields, not on a related record. Apex sharing is the only path.
- **Restriction Rule that whitelists practitioners?** Restriction Rules are static; they can't be dynamic per-record.
- **Territory management / role hierarchy?** Doesn't help — the practitioner isn't in an internal role that inherits from the patient's owner.

Apex-managed sharing is the standard-first answer *for this shape of requirement*.

**Governor-limit exposure:** an Assignment status change is a small transaction (one Assignment, one practitioner, N Medical_History__c rows per patient — typically < 50). Bulk Assignment updates (INT-010's nightly Scheduled Flow reassigning multiple) will process at most a few dozen; the shares scale linearly.

## Integration

None.

## Alternatives considered

- **`RowCause = 'Manual'` instead of a custom Apex Sharing Reason.** Rejected: `Manual` shares are user-deletable. The guardrail "share deletion must be atomic with the status change" requires Apex-exclusive deletion.
- **A single Assignment trigger that owns both share management AND accepted-date stamping (currently INT-009's territory).** Rejected: keeping the security concern in its own trigger + service makes it independently testable and preserves the intent boundary. Two triggers on Assignment__c is fine (`AssignmentTrigger` from INT-009 for status/reassign logic; `AssignmentShareTrigger` here for share side-effects) as long as neither creates recursion — they don't.
- **Deleting all shares on any Status change (belt-and-braces).** Rejected: on a rapid Accepted → Reassigned → Accepted cycle (same practitioner), we'd churn shares unnecessarily. Only revoke on transitions *off* Accepted.
- **Sharing the *Assignment__c* record to expose Medical_History__c indirectly.** Doesn't work — Medical_History__c is a *sibling* of Assignment__c (both hang off Contact/Application), not a child, so Assignment sharing wouldn't propagate.

## Architecture conformance

Not applicable — commercial engagement, no inherited premises.

## Neighboring & future scope

- **BUILT ON:** INT-004 (Medical_History__c object, Private OWD, Restriction Rule — the manual share works because parent is lookup, not master-detail). INT-009 (Assignment__c, `OwnerId` = Practitioner User).
- **BUILDS ON THIS:** nothing declared yet. A future INT-021+ (audit/compliance reporting) will read `Audit_Log__c` to reconstruct who saw what when — the `Manual_Share_Insert` / `Manual_Share_Delete` rows written here are the primary data source.
- **Existing org:** greenfield capstone.

## Build sequence

Standard cascade — no non-obvious ordering. INT-004's object + INT-009's Assignment__c must exist first, both declared as internal deps.

## Open design questions

_none_

Q-019-1 (Practitioner field on Assignment__c) is **settled by INT-009's design**: `OwnerId` = Practitioner User. Route to `/ql-refine-intent INT-019` to mark Q-019-1 as ANSWERED with a pointer to this design.
