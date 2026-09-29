---
intent: INT-009
scope_hash: e7826a71b17e
authored: 2026-09-29
---

# INT-009 — Design

**Intent:** Practitioner community and geolocation-based auto-assignment
**Source intent:** `intents/INT-009/intent.md`

## Data model

- `Assignment__c` (custom object)
  - **`OwnerId` = the assigned Practitioner User.** Not a separate `Practitioner__c` lookup. Rationale:
    - Standard "My Assignments" list view on the Practitioner Community works out of the box (`OwnerId = $User.Id`).
    - Standard sharing (an owner sees their own record) covers the community-visibility requirement without a manual share.
    - Reassignment is a change of ownership (`Owner` field update on the same record) — semantically clean.
    - **This settles INT-019's Q-019-1.** INT-019's trigger reads `Assignment.OwnerId` to identify the Practitioner User for the manual share insert.
  - Fields:
    - `Application__c` — Master-Detail to `Subsidy_Application__c` (INT-008). Roll-ups possible; sharing inherits from Application if Application is Public Read-Only or Private — check with INT-020's OWD design.
    - `Status__c` — Picklist: `Assigned`, `Accepted`, `Declined`, `Completed`, `Reassigned`.
    - `Assigned_Date__c` — DateTime, default NOW() at insert.
    - `Accepted_Date__c` — DateTime, populated on Status → Accepted (Flow or trigger). **Consumed by INT-010's SLA clock.**
    - `Distance_km__c` — Formula (Number) = `DISTANCE(Application__r.Contact__r.Location__c, Owner:User.Contact.Location__c, 'km')`. Sanity-check the formula field's cross-object depth (needs a User → Contact bridge — see Q-design-009-2).
    - `Decline_Reason__c` — Long Text, optional (captured on Decline).
  - Page layout + Lightning record page for the Community (Accept / Decline buttons — Quick Actions calling Flows).

- `Practitioner_Specialty__c` (custom junction)
  - Master-Detail to `Contact` (the practitioner Contact) AND Master-Detail to `Treatment_Type__c` (INT-008).
  - No additional fields for now (`Proficiency_Level__c` may earn its place at a later intent).

- `Contact` extensions (Practitioner side — RecordType `Practitioner`):
  - `Location__c` — Geolocation, populated by an on-Address-change trigger (or standard geocoding rule if the org has Data.com Clean or Google Maps geocoding enabled — see Q-design-009-3).
  - `Current_Load__c` — Roll-up Summary (COUNT of `Assignment__c` where `Status__c IN ('Assigned','Accepted')`, via Practitioner→Assignment relationship). **This requires a lookup from Assignment to the practitioner Contact — but Assignment.OwnerId is a User, not Contact.** The roll-up isn't natively possible from User→Contact. Two fixes:
    - Add `Practitioner_Contact__c` lookup to Contact on Assignment__c, populated by a before-insert trigger from `Owner:User.Contact`. Roll-up rides that lookup.
    - Or: compute `Current_Load__c` in the AssignmentSelector queueable each run (query-time count). Cheaper metadata, more Apex.
    - **Recommend the lookup + roll-up.** Standard-first; the queueable stays lean.
  - `Capacity_Max__c` — Number, per-practitioner cap (admin-set).
  - `On_Leave__c` — Checkbox.
  - `Region__c` — from INT-005 (already declared).

## Sharing & security

- **OWD Assignment__c: Private.** Owners (Practitioners) see their own. Assessors/Team Managers see via role hierarchy up the practitioner's regional branch (INT-005). Patients don't see it directly — INT-008's Application record is their surface.
- **Practitioner Community license (Partner Community):** each practitioner Contact is enabled as a Community User. External Sharing model matters here — sharing sets grant per-record access, but with `OwnerId = Practitioner User` the standard "own records" path handles visibility.
- **Medical_History__c related list on the Assignment community record page:** rendered *only* when INT-019's manual share is present + INT-019's 'Practitioner Medical History Read' PS is assigned. This design proposes: assign the PS at Community User provisioning (part of INT-003's admin-vetting flow); INT-019's trigger gates the manual share on Status = Accepted.

**Cascading consequences:**

- Partner Community license provisioning (INT-003's admin-vetting queue) — needs a runbook step for how a vetted practitioner Contact is converted to a Community User with the 'Practitioner Medical History Read' PS pre-assigned.
- Community app + navigation: a Practitioner Community site with a home page listing Assignments, and Assignment record pages with Accept/Decline actions. Site theme/branding is out of scope here.
- Sharing set for Partner Community: gives community users access to their own Assignment__c records via OwnerId — standard config, but must be enabled at build time.

## Automation approach

Three automation seams:

1. **Trigger `SubsidyApplicationTrigger` on `Subsidy_Application__c` after update.**
   - When `Status__c` transitions to `Awaiting Practitioner` (INT-008 sets this after HIC returns "not covered by insurance"), enqueue `AssignmentSelector` Queueable with the Application Id.
   - Standard-first check: could this be a Record-Triggered Flow? Yes — a Flow can enqueue a Queueable. But the selection logic (SOQL with DISTANCE, dynamic previously-declined filter) is more maintainable as Apex; a Flow-only path would rebuild it in a series of Get/Loop nodes. Apex chosen.

2. **Queueable `AssignmentSelector`.**
   - SOQL:
     ```
     SELECT Id, Location__c
     FROM Contact
     WHERE RecordType.DeveloperName = 'Practitioner'
       AND Region__c = :app.Contact__r.Region__c
       AND On_Leave__c = false
       AND Current_Load__c < Capacity_Max__c
       AND Id IN (
         SELECT Practitioner_Contact__c FROM Practitioner_Specialty__c
         WHERE Treatment_Type__c = :app.Treatment_Type__c
       )
       AND Id NOT IN :previouslyDeclinedContactIds
     ORDER BY DISTANCE(Location__c, :app.Contact__r.Location__c, 'km')
     LIMIT 1
     ```
   - `previouslyDeclinedContactIds` sourced from `Application__c.Previously_Declined_Practitioners__c` (see Q-design-009-1).
   - On zero rows: emit a `Practitioner_Allocation_Failed__e` platform event (or set Application Status to `Manual_Assignment_Required` — see Q-design-009-4).
   - On one row: insert `Assignment__c` with `OwnerId = <selected Contact's User Id>`, `Status = 'Assigned'`, `Assigned_Date = NOW()`. Requires a Contact→User lookup — Partner Community users have `Contact.User__c` implicitly via the Contact-to-User relationship; use `SELECT Users FROM Contact` in the query (or `[SELECT Id FROM User WHERE ContactId = :contactId]`).

3. **Trigger `AssignmentTrigger` on `Assignment__c` after update.**
   - On `Status__c = 'Reassigned'`: append the previous OwnerId's Contact to `Application__c.Previously_Declined_Practitioners__c`, then enqueue `AssignmentSelector` for the same Application. This is the path INT-010's Scheduled Flow uses.
   - On `Status__c = 'Accepted'`: set `Accepted_Date__c = NOW()`. (Also the trigger point for INT-019's manual share — INT-019 owns that trigger separately, or this trigger contains both concerns; recommend keeping INT-019's share logic in its own trigger to preserve intent boundaries and make the security concern independently testable.)
   - On `Status__c = 'Declined'`: same as Reassigned (append + reselect).

**Governor-limit exposure:**

- `DISTANCE()` in SOQL uses the spatial index at scale, but `ORDER BY DISTANCE(...) LIMIT 1` doesn't use the index for sorting — Salesforce warns about full scans past ~10K rows. For ~4,000 practitioners the query is fine; at scale the design would need a bounded box pre-filter (Q-design-009-5).
- Trigger-in-Queueable pattern: safe. Reassignment loops (Decline → new Assignment → Decline again) risk unbounded chain — cap `previouslyDeclinedContactIds.size()` and emit the failure event above a threshold.

## Integration

- **HIC (Health Insurance Commission):** INT-007 owns the callout + platform event; INT-008 owns the Application-side lifecycle. This intent is **downstream** of both — it reads `Application.Status = 'Awaiting Practitioner'`, which INT-008 sets after INT-007's response.
- **Facebook Auth Provider** (INT-003 / practitioner community login): not this intent.
- **Geocoding:** if the org has native geocoding (Setup → Data Integration → Clean Rules), the `Location__c` populates automatically on Address change. Otherwise a before-insert/update trigger calls the Google Maps API — an external dependency this intent's `## Dependencies` doesn't declare. **Flag back to `/ql-refine-intent INT-009`** if Q-design-009-3 lands on the callout path.

## Alternatives considered

- **`Practitioner__c` lookup to User instead of `OwnerId` = Practitioner.** Rejected: the "My Assignments" community list view + reassignment semantics both suffer. Chosen approach makes the record's meaning (`Owner = who owns doing this`) match the domain.
- **Real-time synchronous selection (no Queueable).** Rejected: SOQL selection could exceed the sync transaction's 10-second budget under Community user context at scale.
- **Distance filter in Apex after a Region query.** Rejected: `DISTANCE()` in SOQL is what the spatial index is for; computing in Apex forfeits the platform's optimization.
- **`Practitioner_Specialty__c` as a text/multi-select on Contact.** Rejected: a proper junction supports report queries and future many-to-many extension (a specialty has a capacity ceiling, etc.).
- **Assignment__c as Master-Detail to Contact instead of Application.** Rejected: an Assignment belongs to an Application (one Application can have a chain of assignments over reassignments); the practitioner is the *owner*, not the parent. Master-Detail to Application matches the domain.

## Architecture conformance

Not applicable — commercial engagement, no inherited premises.

## Neighboring & future scope

- **BUILT ON:** INT-003 (Practitioner Community login + admin vetting) — the vetting path provisions the Community User this intent's OwnerId references. INT-004 (Medical_History__c object). INT-005 (Contact.Region__c, role hierarchy). INT-008 (Subsidy_Application__c, Treatment_Type__c, HIC lifecycle upstream).
- **BUILDS ON THIS:**
  - **INT-010** (3-business-day SLA) reads `Assignment__c.Assigned_Date`, `Accepted_Date`, appends to `Previously_Declined_Practitioners__c`, and re-enqueues `AssignmentSelector`. All three fields are designed here — INT-010 is buildable against this design.
  - **INT-011** (assessment form) hangs off `Assignment__c` — expect a Master-Detail from `Assessment__c` to `Assignment__c` in INT-011's design.
  - **INT-019** (practitioner temporary access) reads `OwnerId`. Settled by this design.
  - **INT-012** (15-day escalation) reads Assignment status history.
- **The `Previously_Declined_Practitioners__c` field shape** (Q-design-009-1) affects INT-010's Flow read pattern — surface the pick early.
- **Existing org (brownfield):** greenfield capstone; nothing pre-exists.

## Build sequence

The standard cascade holds with a Setup step wedged in:

1. Contact fields (`Location__c`, `Current_Load__c` roll-up, `Capacity_Max__c`, `On_Leave__c`).
2. `Treatment_Type__c` picker (INT-008 delivered before this intent).
3. `Practitioner_Specialty__c` junction.
4. `Assignment__c` object + fields + roll-up on Contact from Assignment.
5. **Setup step: enable Partner Community + Sharing Set for Assignment__c → runbook.**
6. Community site + record pages + Quick Actions.
7. Triggers + Queueable.
8. Test data + probe tests for `AssignmentSelector`.

## Open design questions

- Q-design-009-1: **`Previously_Declined_Practitioners__c` shape.** Option A — Long Text on Application storing comma-separated 18-char Contact Ids (simple, hits 131K char limit at ~7,000 declines — fine). Option B — normalized junction `Application_Declined_Practitioner__c` (cleaner queries, one extra object). Recommend A; the 7K-decline ceiling isn't a real risk.
- Q-design-009-2: **Cross-object formula depth for `Distance_km__c`.** Salesforce limits cross-object formulas to 5 relationships. The current draft (`Owner:User.Contact.Location__c`) is 3 hops from Assignment; safe. Verify.
- Q-design-009-3: **Geocoding source.** Native (Data.com Clean rule) vs. Google Maps callout trigger. Native is standard-first and free; only reach for the callout if the capstone org lacks the Clean rule.
- Q-design-009-4: **On zero-match failure.** Emit a platform event, or set Application Status to `Manual_Assignment_Required`? Recommend Status + a Case created for regional Ops — the event pattern needs a subscriber.
- Q-design-009-5: **Scale ceiling for the DISTANCE() SOQL.** At ~4,000 practitioners the ORDER-BY-DISTANCE + LIMIT 1 is safe; the design has no bounded-box pre-filter. A future INT-021+ that raises practitioner counts would need to add one.

## Related decision record

The material architecture calls above (Assignment.OwnerId as the practitioner; `Practitioner_Specialty__c` as a junction; `AssignmentSelector` as a Queueable, not a Flow) warrant a `decisions/YYYY-MM-DD-int-009-architecture.md` — capture them alongside this design at ratification time.
