---
intent: INT-004
scope_hash: 7a87f285c64b
authored: 2026-09-29
---

# INT-004 — Design

**Intent:** PHI security foundation — Medical_History__c Private OWD, Restriction Rule, break-glass permission set
**Source intent:** `intents/INT-004/intent.md`

## Data model

- `Medical_History__c` (custom object)
  - **Relationship to Contact: `Patient__c` lookup, required, restrict-delete.** Not master-detail — master-detail inherits parent Contact's sharing, undermining the Private OWD requirement. Lookup keeps Medical_History__c on its own sharing model.
  - OWD: Private.
  - Fields (all Shield-encrypted per the classification matrix — see Q-004-1): `Diagnosis__c` (Text), `Diagnosis_Code__c` (Text — deterministic encryption for searchability), `Medication__c` (Long Text), `Allergy__c` (Long Text), `Notes__c` (Long Text — probabilistic encryption), `Encounter_Date__c` (Date).
  - Page layout, Lightning record page, and `Related List` on Contact (visibility controlled by FLS + permission sets, not by removing the related list).

- `Audit_Log__c` (custom object) — engagement-wide audit sink.
  - Fields: `User__c` (User lookup), `Action__c` (Picklist: `Break_Glass_Grant`, `Break_Glass_Revoke`, `Manual_Share_Insert` (INT-019), `Manual_Share_Delete` (INT-019), `Regional_Access_Override` (INT-020, future)), `Reason__c` (Long Text, required for Break_Glass_Grant), `Target_Object_Type__c` (Text), `Target_Object_Id__c` (Text — 18-char Id), `Timestamp__c` (DateTime, default NOW()).
  - OWD: Public Read-Only for reporting to compliance; write via automation only (validation rule blocks user DML).

## Sharing & security

- **OWD Medical_History__c: Private.** Confirmed.
- **Restriction Rule `Internal_Profiles_Blocked` on Medical_History__c:** User criteria = the running user's profile is *not* in a small blocklist (Assessor, Team Manager, Regional Ops Manager, System Administrator, Standard User). Record criteria = default (no filter). See Q-design-004-1 for the filter shape trade-off.
- **Permission set `PHI Emergency Access`:**
  - Grants the Restriction Rule exception (Restriction Rules honor permission-set enforcement).
  - Grants Read on Medical_History__c object + FLS on all encrypted fields.
  - Assigned only to users with the Compliance Officer role (INT-005 owns the role definition). Manual assignment flow (below) enforces the assignment path.
- **FLS default:** all Medical_History__c fields are `Read=False, Edit=False` on every profile. The 'PHI Emergency Access' PS and INT-019's 'Practitioner Medical History Read' PS are the only paths to FLS Read.
- **Shield Platform Encryption:**
  - `Diagnosis_Code__c`: deterministic (allows equality-match reports for compliance queries).
  - `Diagnosis__c`, `Medication__c`, `Allergy__c`, `Notes__c`, `Encounter_Date__c`: probabilistic.
  - **Blocked on Q-004-1** — the field-level encryption call needs the PHI classification matrix. The design proposes deterministic-on-code / probabilistic-on-free-text as the default; the matrix may override.

**Cascading consequences** — the ripple this design implies:

- The **Compliance Officer profile/role** must exist before the PHI Emergency Access PS assignment is meaningful → INT-005 dep declared.
- The Medical_History__c page layout and Lightning record page must exist for the related-list visibility on Contact — scoped to this intent's build.
- Community record page rendering (Practitioner Community) is INT-019's problem, not this one — cross-referenced in guardrails.

## Automation approach

**Standard-first path holds for Restriction Rule + PS (declarative).** One Apex trigger is needed for the audit sink:

- **Trigger `AuditPermissionSetAssignmentTrigger` on `PermissionSetAssignment` after insert / after delete:**
  - Filter: `PermissionSet.Name IN ('PHI_Emergency_Access')` (also lists INT-019's PS when it lands).
  - On insert: write `Audit_Log__c` with `Action__c = 'Break_Glass_Grant'`, `Reason__c` from a required companion field.
  - On delete: write `Audit_Log__c` with `Action__c = 'Break_Glass_Revoke'`.
- **Assignment wrapper Flow `Assign_Break_Glass_PS`:** the only sanctioned path an admin uses to assign the PS. Takes a required `Reason` input, writes a companion custom setting record the trigger reads. Direct PSA insert via Setup UI is discouraged by procedure (can't be technically blocked short of a Restriction Rule on PermissionSetAssignment, which is not supported).

**Governor-limit exposure:** PermissionSetAssignment DML is small-volume (a Compliance Officer break-glass is measured in units per day, not thousands). Bulk-safe pattern is trivial here.

## Integration

None. Shield Platform Encryption is a Salesforce feature, not an integration.

## Alternatives considered

- **Master-detail from Medical_History__c to Contact.** Rejected: master-detail forces parent sharing on child, violating Private OWD. Lookup is the only path that keeps sharing independent.
- **Apex-managed sharing for compliance officers instead of Restriction Rule + PS.** Rejected: Restriction Rules + a PS-gated exception is the *standard-first* pattern for "block everyone except this permission set." Apex sharing would rebuild what the platform does natively.
- **Standard `LoginHistory` / `SetupAuditTrail` for audit.** Rejected: these don't capture the *reason* attribute the compliance workflow needs, and they're not query-friendly for compliance reports.
- **Field-level encryption via Classic Encryption instead of Shield.** Rejected: Classic doesn't support FLS + reporting the way Shield does; PHI requires Shield's key management guarantees.

## Architecture conformance

Not applicable — commercial engagement, no inherited premises in `scopezilla/decisions/`.

## Neighboring & future scope

- **BUILDS ON THIS:** INT-019 (practitioner temporary access via Medical_History__Share — needs Private OWD + non-master-detail parent), INT-009 (community record page's related list on Contact renders Medical_History__c *only* when INT-019's manual share is present). The chosen lookup relationship is compatible with manual shares; master-detail would not have been.
- **BUILT ON:** INT-005 (Compliance Officer role/profile).
- **Audit_Log__c is engagement-wide.** INT-019 will write to it (manual share insert/delete); a future INT-020-adjacent regional-access-override intent will too. Design keeps `Action__c` picklist extensible.
- **Existing org (brownfield):** greenfield capstone org. Nothing pre-exists. `⚠ org not consulted` in the classic sense; capstone acts as its own greenfield.

## Build sequence

Standard cascade with one wrinkle:

1. Deploy Medical_History__c object + fields (unencrypted first).
2. Deploy Restriction Rule + 'PHI Emergency Access' PS.
3. Enable Shield Platform Encryption per Q-004-1 matrix — **manual Setup step, not metadata-deployable** → `delivery/deploy-runbook.md`.
4. Encrypt fields (metadata deploy with `encryptionScheme` set).
5. Deploy Audit_Log__c + trigger + Flow.

Step 3 is the deploy-runbook step because Shield enablement is a per-org Setup toggle Salesforce owns.

## Open design questions

- Q-design-004-1: **Restriction Rule filter shape.** Option A — profile-name blocklist (Assessor, Team Manager, Regional Ops Manager, System Administrator, Standard User) — brittle if profiles are renamed. Option B — `$User.hasPermissionSet('PHI_Emergency_Access') = false` — cleaner semantics, but Restriction Rule User Criteria can't reference PSAs directly; needs a formula field on User that's populated by the audit trigger. Recommend Option B once the PSA trigger writes the formula; Option A as a stopgap.
- Q-design-004-2: **Audit_Log__c retention.** Not addressed by the intent. Compliance likely wants indefinite retention; a Big Object archive (mirror of INT-001's LDV design) may apply at year 5+. Non-blocking for the initial build.
