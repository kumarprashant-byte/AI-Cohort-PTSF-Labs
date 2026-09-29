# Phase 1 — Platform Foundation, Identity & PHI Security (PTSF Patient Travel Support)

> **Phase orchestration — what's in/out of phase, dependencies, starting state.** Read this first to orient. Per-capability buildable specs live in `11-intents-1.md` (when present) — that's what you actually build against, one intent at a time.
> Phase duration: **sequence only — no committed duration**.

## Intent

- **For:** The PTSF Platform Team and Program IA — the people who need the org, the identity fabric, and the PHI security model working before any patient, practitioner, or assessor touches the platform.
- **Outcome:** Ship a working org (production + sandboxes), source-controlled CI/CD, three regional AD federations, patient/practitioner login channels, and the Medical History security model — Private OWD + Apex-managed sharing + Restriction Rules + break-glass audit — proven end-to-end in a lower environment so downstream phases can build against a security floor that is already known-correct.
- **Measured by:** - Production and all lower sandboxes exist and are named per convention; a trivial change promotes CI-driven from feature branch through Partial → Full → Production.
- An Assessor in each of the three regions signs in with their regional AD credentials and lands with Region and Language attributes pre-populated.
- A patient can register with Facebook and email/password; a practitioner can self-register through the vetting queue.
- A demo Assignment moves to Accepted and the associated practitioner sees the patient's Medical_History__c rows; the same Assignment moves to Completed and the medical history rows disappear from the practitioner's view.
- A System Administrator with View All on Contact cannot reach any Medical_History__c record.
- The "PHI Emergency Access" permission set grants a Compliance Officer a scoped, audited exception.
- **Must not:** Build the patient onboarding wizard, HIC integration, subsidy application object beyond a placeholder, practitioner assignment logic, or any migration ETL. Introduce a global org, cross-region sharing rules, or a role-hierarchy grant on Medical_History__c. Skip compliance signoff on the break-glass design.

## Pre-decided (do not re-litigate)
- Single global org for now (F1 strawman). The G0904 residency fork is treated as **resolved to global** for this phase's build; if Phase 0 flips it, this phase is re-scoped, not overlaid.
- Three regional AD federations (SAML/OIDC + JIT), Facebook Auth Provider for patients, self-registration-with-vetting for practitioners (subject to Q-003-1).
- Medical_History__c is a child of Contact with OWD Private; sharing is Apex-managed and lifecycle-bound to Assignment.Status; a Restriction Rule blocks every internal profile; break-glass runs through a Compliance-Officer-assigned permission set with mandatory Audit_Log__c writes.
- Shield Platform Encryption applies deterministically to searchable PHI fields, probabilistically to free-text.
- LDV baseline: skinny table + selective indexes on Subsidy_Application__c placeholder; Big Object archival design captured in the platform runbook.

## Plan-mode questions (resolve before switching to Build mode)
- **Q-003-1 (practitioner auth path):** self-registration-with-vetting, or federated against a professional-registry IdP if one exists? If federated, INT-003 changes shape and a fourth IdP integration lands in Phase 1.
- **PHI classification matrix:** which fields on which objects are PHI vs. PII vs. non-sensitive? The Restriction Rule + Shield config both depend on this.
- **Break-glass audit exception:** who is a Compliance Officer, and what is the retention policy on Audit_Log__c? Legal needs to sign this off before build begins.
- **BusinessHours records:** which per-region holiday calendar do we use in year one? This is authoritative for Phase 3's SLA math.

## Build-mode questions (ask only if the situation arises)
- If a User attribute the JIT handler expects is missing from a SAML assertion, what is the fallback — reject the login, or provision with a "needs review" flag?
- If the Shield deterministic encryption breaks a specific report at runtime, does the report get rewritten or does the field move to probabilistic (which loses the search)?

## Epics in scope for this phase

The phase brief is authoritative. Epics below are listed for cross-reference only — when an automation cites `(E04)`, this is what it refers to. For deeper epic narrative, see `90-epics-context.md`.

- **E12: Platform Foundation & DevOps** — Org strategy (single global org vs per-region — see G0904), sandboxes, DevOps toolchain, release management, monitoring, LDV strategy (skinny tables, archiving) for the 5M-patient / 1M-application-per-year data volume.
- **E08: Identity & Authentication** — Internal user SSO to three regional Active Directory instances (federated, per-region IdP). Patient login (email/password + Facebook social sign-on). Practitioner authentication method (federated or self-registration with vetting) — TBC.
- **E09: Data Security & PHI Visibility Model** — Medical History as a separate object with Private OWD. Apex-managed sharing granted on assignment acceptance and revoked on assignment close (TTL model). Restriction Rules deny visibility to internal PTSF profiles. Field-level security, encryption evaluation (Shield). Cross-region residency model TBC.

## Build targets — orchestration summary

These sections orient the build agent on the shape of the phase. Per-capability buildable detail (Outcome, Build target, Guardrails, Out of scope, Acceptance, Open questions) lives in `11-intents-1.md` per intent. When a section below cites `INT-NNN`, look up the intent there.

### Data model
- **Contact** (standard): RecordType `Patient` and RecordType `Practitioner`; Region__c, Language_Preference__c, Onboarding_Complete__c (Patient), Location__c geolocation (Practitioner — geocoded in Phase 3), On_Leave__c, Capacity_Max__c, Current_Load__c (Practitioner).
- **Account** (standard): RecordType `Household` (Patient) and RecordType `Practice` (Practitioner).
- **Medical_History__c** (custom child of Contact): OWD Private. Fields per the classification matrix — Diagnosis_Code__c (deterministic Shield), Notes__c (probabilistic Shield), Date_Recorded__c.
- **Audit_Log__c** (custom): Actor__c, Action__c, Target_Record_Id__c, Reason__c, Timestamp__c. Insertable only, never updatable.
- **Placeholder objects** created in Phase 1 but not built out until Phase 2/3: Subsidy_Application__c, Assignment__c, Assessment__c, HIC_Check__c, Treatment_Type__c, Practitioner_Specialty__c, Subsidy_Determination_Rule__c, Onboarding__c.

### Automation
- Apex trigger on Assignment__c (`AssignmentSharingHandler`): on Status → Accepted, insert Medical_History__Share manual shares granting Read to the practitioner User for every Medical_History__c on the patient Contact. On Status → Completed / Declined / Reassigned, delete those manual shares. Bulk-safe.
- JIT provisioning Apex handler: creates the User from SAML assertion attributes (Region, Language, Profile).
- Break-glass mechanism: assigning the "PHI Emergency Access" permission set writes an Audit_Log__c row with the granting Compliance Officer, the target Contact, and the reason.

### UI & navigation
- MyDomain login page routes each region to its regional IdP; a small region-picker on the shared login screen for edge cases.
- Compliance Officer utility page for granting the break-glass permission set — Reason is mandatory.
- No end-user UI ships in this phase beyond login and the compliance utility.

### Security & access
- OWD Private on Medical_History__c and Audit_Log__c; Public Read-Only on Subsidy_Application__c, Assignment__c, Assessment__c with a criteria-based sharing rule constraining to same-Region users.
- Restriction Rule on Medical_History__c: `User.Profile.Name IN (Assessor, Team Manager, Regional Ops, System Administrator) → No access`.
- Permission sets per Profile × Region combination.
- No profile has View All / Modify All on Medical_History__c.

### Reports & dashboards
- Compliance report: every Audit_Log__c row in the last 30 days with actor, target, reason.
- Security posture report: users assigned "PHI Emergency Access" today.
- No operational reports in this phase.

### Sample data
- 6 sample Contacts (2 per region), 4 marked as Practitioners with Specialties, 2 as Patients with Medical_History__c.
- 2 sample Assignments (one Accepted, one Completed) to prove the sharing lifecycle in an acceptance run.
- 1 sample Audit_Log__c to demonstrate the break-glass shape.

## Acceptance — user-outcome checks (phase-level)

Phase-level user-outcome claims a stakeholder would walk through to feel "Phase 1 is done." Run them in conversation with the user; mark `- [x]` only when the user agrees. Per-intent acceptance walkthroughs live in `11-intents-1.md`.

- [ ] A DevOps engineer promotes a trivial custom-label change from a feature branch to Production through the CI pipeline.
- [ ] An APAC Assessor authenticates against the APAC AD and lands with Region__c = APAC in a single sign-on hop.
- [ ] A patient registers with Facebook and reaches the onboarding-wizard entry screen (wizard itself is Phase 2).
- [ ] A practitioner self-registers, is admin-vetted, and can log in to a placeholder practitioner community home.
- [ ] A demo Assignment moves to Accepted; the assigned practitioner sees the patient's Medical_History__c rows on the assignment page. Move to Completed; those rows are gone.
- [ ] A System Administrator with View All on Contact cannot reach any Medical_History__c record — no error, no leak, no records visible.
- [ ] A Compliance Officer grants the break-glass permission set with a reason; an Audit_Log__c row exists with all four fields populated.

## Acceptance — metadata-shaped checks (phase-level)

Phase-level metadata-shaped checks — queries the build agent runs against the target org without human help. Run via the Metadata skill (describe / tooling / SOQL). Per-intent acceptance is in `11-intents-1.md`.

- Restriction Rule exists on Medical_History__c and lists every internal profile.
- No sharing rule targets Medical_History__c.
- OWD for Medical_History__c and Audit_Log__c is Private.
- Three SAML SSO configurations exist and are active.
- JIT handler class is deployed and referenced by all three SSO configurations.
- BusinessHours records exist for APAC, EMEA, AMER.
- Named permission set for "PHI Emergency Access" exists, is not assigned by default, and grants only the Restriction Rule bypass and Audit_Log__c insert.

## Out of scope for Phase 1

If you find yourself needing to build any of these, stop and surface it — it belongs to a later phase or is explicitly excluded.

_(none surfaced in gaps.json — confirm with user during plan-mode review)_

## Dependencies and risks

**Dependencies:** Phase 0 architecture locks.

**Risks:** Restriction Rule + break-glass model is subtle — needs a compliance signoff before dependent phases start writing PHI. LDV design (skinny tables, indexes) has to be right first time given target volumes.

## Story citations covered in this phase

_(no user-story backlog captured for this phase)_

## Recipe boundary

When this phase is accepted, ask the user: *"Save this run as a recipe so we can repeat for Phase 2?"* The recipe should capture: the data-model decisions made above, the naming patterns confirmed in `03-glossary-and-naming.md`, and any Build-mode question resolutions that emerged.
