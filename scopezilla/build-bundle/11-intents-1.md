# Intent Statements — Phase 1 (PTSF Patient Travel Support)

> Reference role: the **load-bearing build target** for Phase 1. Each intent below is one capability — one firing trigger or user action, one outcome, one walkthrough. Build one at a time. The phase brief (`10-phase-1.md`) is orchestration; this file is what to build.
>
> **For architects:** walk these with the customer to assign priority and answer open questions. Edit `data/intents.json` (canonical) or this file directly — the next quantum-leap run re-renders from JSON.

## INT-001 — Provision org, sandboxes, and DevOps pipeline

epic `E12` · priority _(unassigned)_ · confidence _Confirmed_ · surface `devops`

### 1. Outcome

A production org and lower sandboxes are stood up with a source-controlled CI/CD flow so every subsequent phase deploys metadata predictably.

### 2. Build target

- Production org, Full Sandbox, Partial Sandbox, and N Developer Pro sandboxes exist and are named per convention
- Source repo holds the base metadata (profiles, permission sets, custom settings, base custom objects)
- CI/CD pipeline deploys a change from a feature branch through Partial → Full → Production
- LDV baseline set: skinny table + selective indexes on Subsidy_Application__c placeholder, Big Object archival design captured
- Business Hours records exist per region (APAC, EMEA, AMER) for downstream SLA math

### 3. Guardrails

- Must not create org-wide sharing rules or Restriction Rules (INT-004 owns PHI security)
- Must not create the Subsidy_Application__c or Assignment__c objects (INT-007/INT-009 own them)
- Must not enable Shield Platform Encryption without the Phase 0 PHI classification signoff

### 4. Out of scope

- Must not stand up per-region orgs (deferred to G0904 resolution)
- Must not procure Partner Community licenses (belongs to INT-009)

### 5. Acceptance

A DevOps engineer merges a trivial custom-label change on a feature branch, watches CI promote it through the sandbox tiers to Production, and confirms the label appears in Setup in each org.

### 6. Dependencies

- **External:** Salesforce Licensing — Service Cloud + Experience Cloud + sandbox licenses provisioned _(owner: PTSF IT)_

### Open questions

_(no open questions captured)_

---

## INT-002 — Federate three regional Active Directories with JIT provisioning

epic `E08` · priority _(unassigned)_ · confidence _Assumed_ · surface `security`

### 1. Outcome

Internal PTSF users sign in with their regional AD credentials and land in Salesforce with Region and Language attributes pre-populated.

### 2. Build target

- Three SAML Single Sign-On configurations (one per regional AD: APAC, EMEA, AMER)
- JIT provisioning handler that creates the User with Profile, Region__c, and Language attributes from the SAML assertion
- MyDomain configured; login page routes each region to the correct IdP
- Named permission set for each region grants regional data-scope access

### 3. Guardrails

- Must not federate patient or practitioner logins (INT-003 owns those)
- Must not grant a JIT-provisioned user any PHI-access permission set

### 4. Out of scope

- Must not build a global AD federation (three regional trusts is the ratified design)

### 5. Acceptance

An Assessor in EMEA authenticates against the EMEA AD, lands in Salesforce with Region__c = EMEA and Language = French pre-set, and can open a French-locale application list view.

### 6. Dependencies

- **External:** PTSF Regional AD (APAC/EMEA/AMER) — SAML metadata + JIT attribute contract _(owner: PTSF IT / regional AD admins)_

### Open questions

_(no open questions captured)_

---

## INT-003 — Patient and practitioner login (email/password, Facebook, and partner path)

epic `E08` · priority _(unassigned)_ · confidence _Assumed_ · surface `experience-cloud`

### 1. Outcome

Patients and practitioners can register and log in through the right channel for their role, without touching internal identity.

### 2. Build target

- Experience Cloud login pages for Patient Portal (email/password + Facebook Auth Provider) and Practitioner Community (partner path per G0401 resolution)
- Self-registration for patients; admin-vetting queue for practitioner registrations (strawman)
- Password/reset flows in each site's supported languages
- Auth Provider config for Facebook, tested against a real developer app

### 3. Guardrails

- Must not merge patient and practitioner Contact records — RecordType keeps them distinct
- Must not provision a Partner Community license until admin vetting completes

### 4. Out of scope

- Must not build passwordless / magic-link auth (not requested)

### 5. Acceptance

A patient registers with Facebook, lands on the onboarding wizard entry screen; separately, a practitioner self-registers, waits for admin approval, and then logs in to a practitioner-community home page.

### Open questions

- [ ] **Q-003-1** — Is the practitioner auth path self-registration-with-vetting, or federated against a professional-registry IdP? (Resolver: PTSF Program Sponsor + IA)

---

## INT-004 — PHI security model — Medical_History__c Private OWD + Apex-managed sharing + Restriction Rules

epic `E09` · priority _(unassigned)_ · confidence _Confirmed_ · surface `security`

### 1. Outcome

Practitioners see a patient's medical history only during an open assessment; internal PTSF staff never see it, verified by a Restriction Rule that even View All can't bypass.

### 2. Build target

- Medical_History__c custom object as child of Contact, OWD Private
- Apex trigger on Assignment__c: on Status → Accepted, insert Medical_History__Share rows granting Read to the Practitioner User; on Status → Completed/Declined/Reassigned, delete those manual shares
- Restriction Rule on Medical_History__c blocking all internal profiles (Assessor, Team Manager, Regional Ops, System Administrator)
- 'PHI Emergency Access' permission set — Compliance-Officer-assigned only — granting the Restriction Rule exception
- Audit_Log__c custom object capturing every break-glass grant with reason
- Shield Platform Encryption applied per the classification matrix (deterministic on searchable fields, probabilistic on free-text)

### 3. Guardrails

- Must not use standard sharing rules or role-hierarchy grants on Medical_History__c — only manual shares via the trigger
- Must not expose Medical_History__c through any report, list view, or related list on an internal profile
- Must not defer break-glass audit logging — the grant and the log write are the same transaction

### 4. Out of scope

- Must not encrypt attachments (E10 migration will decide separately)

### 5. Acceptance

A compliance-officer test: log in as a System Administrator with View All on Contact, open a patient record, try to reach Medical_History__c — no records visible, no error, no leak. Then a practitioner-side test: an Assignment moves to Accepted; the practitioner sees the patient's Medical_History__c rows on the assignment record. Move the Assignment to Completed; the practitioner refreshes and the records are gone.

### 7. Grounding

- **Source artifact:** decision: Private OWD Medical History with Apex-managed sharing _(data/memory.json#decision_log)_

### Open questions

_(no open questions captured)_

---

## INT-005 — Region-scoped OWD and role hierarchy for non-PHI records

epic `E09` · priority _(unassigned)_ · confidence _Assumed_ · surface `security`

### 1. Outcome

Every non-PHI record is scoped to its region by default — an APAC Assessor doesn't see EMEA cases, and reports honor row-level security automatically.

### 2. Build target

- Region__c on User, Contact, Subsidy_Application__c, Assignment__c, Assessment__c
- OWD Public Read-Only for Subsidy_Application__c, Assignment__c, Assessment__c with a criteria-based sharing rule constraining visibility to same-Region users
- Role hierarchy modeled per region (Regional Ops Manager → Team Manager → Assessor)
- Permission set groups per Profile × Region combination

### 3. Guardrails

- Must not apply this pattern to Medical_History__c (INT-004 owns it)
- Must not let a role-hierarchy grant cross regions

### 4. Out of scope

- Must not build cross-region reporting overrides (Reporting phase decides)

### 5. Acceptance

An APAC Assessor opens the All Open Applications list view and sees only APAC applications; the EMEA Regional Ops Manager sees only EMEA.

### Open questions

_(no open questions captured)_

