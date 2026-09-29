# PTSF — Solution Design

Architecture reference for the Patient Travel Support Foundation Salesforce program. Read alongside `00-discovery-brief.md` (context + open questions) and `data/epics.json` / `data/estimates.json` (scope + T-shirt sizes).

---

## Architecture Foundations

Cross-cutting decisions that constrain every epic. Confirm these first — a change to any of them reshapes multiple epics.

### F1. Org strategy — single global org (strawman)

Working assumption: **one production org** with Region as a first-class field on User, Contact, Practitioner, and Subsidy Application, driving OWD + Restriction Rules + reporting scope.

**Open fork (G0904):** if EMEA (or another region) has data-residency law requiring in-region storage, we shift to **three regional orgs + a cross-region assignment integration layer**. This roughly doubles platform cost and turns E04 (practitioner assignment) from an in-org SOQL query into an inter-org integration. Confirm residency before design lock-in.

### F2. Salesforce clouds & license shape (strawman, G0101)

| Surface | Product | License basis |
|---|---|---|
| Patient portal | Experience Cloud (LWR) | Customer Community Login |
| Practitioner community | Experience Cloud (Aura or LWR) | Partner Community × ~4,000 |
| Internal Assessor/Manager | Service Cloud | Service Cloud user |
| Chat + deflection | Digital Engagement + Einstein Bots + Knowledge | Add-on |
| Data model | Platform | Standard + custom objects |
| Encryption | Shield Platform Encryption (E09) | Add-on |

Health Cloud is *not* in the strawman — the brief describes a subsidy workflow, not a clinical care record. Confirm.

### F3. Integration pattern — async by default, sync only where user-blocking is trivial

Because the Health Insurance Checker can take 15 seconds at peak (a ratified premise from discovery), all HIC calls are asynchronous: Platform Event → Queueable Apex → callback writes result to a linked record; UI shows a pending state. Applied consistently: address validation may be sync (sub-second), all HIC and future third-party integrations default to async.

### F4. Data model — custom objects on Contact/Account backbone

Contact = Patient, or Practitioner (distinguished by RecordType). Account = Household (patient) or Practice (practitioner). Custom objects for the transactional surface: Subsidy_Application__c, Assessment__c, Assignment__c, Medical_History__c, Treatment_Type__c, HIC_Check__c, Subsidy_Determination_Rule__c.

### F5. Security model — Private OWD on PHI, region-scoped everywhere else

- Medical_History__c: OWD Private, Apex-managed sharing lifecycle-bound to Assignment (E09).
- Restriction Rules block internal profiles from Medical_History__c.
- Everything else: Region-scoped OWD or role hierarchy where region-aligned.

### F6. Identity — three federations + social + one partner path

Three regional AD federations (SAML, JIT provisioning of User) for internal users. Facebook Auth Provider for patients. Practitioner auth still open (G0401) — strawman is self-registration with vetting.

### F7. Async & scheduled compute — the standard tools apply

Platform Events for cross-system triggers, Queueable Apex for chained work, Scheduled Flow for time-based reassessments (the 3-business-day reassignment in E04 and the 15-day escalation in E05). Business Hours records per region.

---

## Solution Journey by Epic

Ordered along the patient's journey through the platform (registration → application → assessment → approval → disbursement), with supporting internal and horizontal epics following.

### E01 — Patient Onboarding & Portal (L)

**Journey:** A patient lands on the public Experience Cloud site, registers with email/password or Facebook. On first login, they enter a wizard that captures name, DOB, address, language preference, and insurance. On wizard entry, an async HIC call fires; when it returns, prefill is applied. Address is validated via a callout (Loqate strawman). On completion, a localized welcome email fires. The patient cannot apply for a subsidy until the wizard is complete.

**Key components:** LWR site, LWC wizard, Onboarding__c staging record, Platform Event `HIC_Prefill_Requested__e`, Address Validation callout, Email Template set (per language), Contact.Onboarding_Complete__c gate.

**Risks / opens:** G0102 (address validator vendor), G0302 (HIC prefill payload schema).

### E02 — Subsidy Application Lifecycle (L)

**Journey:** A patient with complete onboarding creates a Subsidy_Application__c. They pick a treatment type from a hierarchical picker (500+ leaves), enter reason, and re-verify medical history against their prior submissions. On submission, an async HIC verification fires (E03). If HIC indicates the insurance covers travel, the application is auto-rejected with a Flow-generated explanation. Otherwise, assignment logic kicks in (E04).

**Key components:** Subsidy_Application__c, Treatment_Type__c (hierarchical), Medical_History__c snapshot mechanism, Status field + state machine in Flow.

**LDV posture:** Skinny table + selective indexes on Status + Region + Created_Date. Applications closed > 3 years archived to Big Objects (E12).

**Risks / opens:** G0201 (picker structure).

### E03 — Health Insurance Checker Integration (M)

**Journey:** HIC is called at two points: (a) onboarding, to prefill; (b) application submission, to verify entitlement and drive auto-reject. Both are async.

**Pattern:**
1. Requesting record fires a Platform Event.
2. Trigger enqueues a Queueable that calls HIC via Named Credential.
3. Queueable writes HIC_Check__c linked to the source record and fires a completion Platform Event.
4. Flow subscribed to the completion event either prefills (onboarding) or drives auto-reject (application).

**Resilience:** 20s callout timeout; retry with exponential backoff up to 3 attempts; on final failure, record enters 'HIC-check pending' state and a Scheduled Flow retries hourly for 24h. Idempotency key = SHA(record_id, submitted_at).

**Risks / opens:** G0301 (SLA and rate limits), G0302 (payload).

### E04 — Medical Practitioner Community & Assignment (XL)

**Journey:** 4,000 external Medical Practitioners are enrolled as Partner Community users on Contact records with geolocation and a treatment specialty junction to Treatment_Type__c. When a Subsidy_Application__c is submitted and not auto-rejected, an Apex trigger enqueues a Queueable that selects the nearest available practitioner (SOQL with DISTANCE()), filtered by treatment specialty, not-on-leave, and capacity remaining. An Assignment__c is created, the practitioner is notified via the community. The practitioner has 3 business days (per their region's Business Hours) to accept. A Scheduled Flow at midnight scans Assignments where Accepted_Date is null and Assigned_Date < TODAY - 3 business days, and reassigns using the same logic, excluding the declined practitioner.

**Key components:** Partner Community licenses × ~4,000, Contact geocoded on address change, Practitioner_Specialty__c junction, Assignment__c, Business Hours per region, Scheduled Flow.

**Assignment logic detail:**
```
SELECT Id FROM Contact
WHERE RecordType = 'Practitioner'
  AND On_Leave__c = false
  AND Current_Load__c < Capacity_Max__c
  AND Id IN (SELECT Practitioner__c FROM Practitioner_Specialty__c
             WHERE Treatment_Type__c = :treatmentId)
  AND Id NOT IN :previouslyDeclined
ORDER BY DISTANCE(Location__c, :patientLocation, 'km')
LIMIT 1
```
Tie-breakers, capacity semantics, and 'business day' per region are open (G0402, G0403).

**Risks / opens:** G0401 (practitioner auth), G0402, G0403; license count of ~4,000 is a material commercial line.

### E05 — Digital Assessment & Escalation (M)

**Journey:** On accepting an Assignment, the practitioner opens the Assessment_LWC in the community, which loads a treatment-specific dynamic form. They complete it, optionally requesting an additional specialist assessment (spawns a child Assessment__c + a new Assignment for the specialist via E04 logic). Once submitted, the assessment goes to the internal Assessor (E06). If any Assessment.Status = Pending exceeds 15 days from Assigned_Date, a Scheduled Flow escalates it to the Team Manager via [Task | Case | Chatter — G0501].

**Key components:** Assessment__c, Dynamic Form via LWC + metadata-driven layouts per Treatment_Type__c, Scheduled Flow for escalation.

### E06 — Application Review, Approval & Subsidy Determination (L)

**Journey:** Internal Assessors work a Service Console with Subsidy_Application__c as the primary tab. Related records shown: Assessment(s), HIC_Check(s), Practitioner info. **Medical_History__c is NOT shown** (Restriction Rules — E09). When ready to approve, the Assessor invokes a "Determine Subsidy" Flow: it computes a proposed amount from Practitioner.Distance_From_Patient × Transport_Type multipliers stored in Subsidy_Determination_Rule__c. Assessor can adjust and submit. If Amount > Region.Threshold, an Approval Process routes to the Team Manager (role hierarchy).

**Key components:** Service Console app, Subsidy_Determination_Rule__c, Flow calculator, Approval Process.

**Risks / opens:** G0601 (BRE vs Flow decision-support), G0602 (thresholds + hierarchy), G0603 (payment integration boundary).

### E07 — Chat, Messaging & Support Deflection (M)

**Journey:** Both Experience Cloud sites embed a Messaging for In-App/Web widget. Einstein Bot answers first; on intent handoff or user request, routes to an Omni-Channel queue backed by Assessors. Chat routing includes language and region as skills. Knowledge base seeded from the current static-website FAQ content.

**Risks / opens:** G0701 (channel choice); Digital Engagement licenses.

### E08 — Identity & Authentication (L)

**Journey:**
- **Internal users:** SSO into Salesforce via SAML/OIDC against their regional AD. JIT provisioning creates the User with Region + Language attributes.
- **Patients:** Email/password local, or Facebook via Auth Provider.
- **Practitioners:** Strawman = self-registration → admin vetting queue → Partner Community license granted. Alternate = federated auth against a professional-registry IdP if PTSF has one (G0401).

**Risks / opens:** G0401, G0801.

### E09 — Data Security & PHI Visibility Model (L)

**Design:**
- **Medical_History__c** — child of Contact, OWD = Private, no default sharing, no view/modify all on non-admin profiles.
- **Sharing lifecycle** — Apex trigger on Assignment__c:
  - `AFTER UPDATE` where Status transitions to Accepted → create `Medical_History__Share` rows for all Medical_History__c of the patient Contact, granting Read to the Practitioner User.
  - `AFTER UPDATE` where Status transitions to Completed/Declined/Reassigned → delete those Manual shares.
- **Restriction Rule** on Medical_History__c: `User.Profile.Name IN (internal profiles) → No access`. This blocks even View All on internal admins.
- **Break-glass** — a dedicated "PHI Emergency Access" permission set (assignable by a Compliance Officer profile only) provides a Restriction Rule exception; assignments logged to a custom Audit_Log__c with reason.
- **Shield Platform Encryption** — deterministic on encrypted fields that need search (e.g., Diagnosis_Code__c); probabilistic on free-text.

**Risks / opens:** G0901 (classification), G0902 (audit exceptions), G0903 (Shield), G0904 (residency — links to F1).

### E10 — Data Migration from TAMS (XL)

**Approach:**
1. **Discovery per office** (10 offices × 3 regions) — schema inventory of each TAMS instance; ETL adapter per unique shape.
2. **Staging in ETL tool** (MuleSoft or Informatica) — canonical model with source-office attribution.
3. **Dedup** — Contact matching on (Family Name + DOB + Email + Region) with a Data Steward review queue for near-matches (<95% score).
4. **Load** — Bulk API 2.0 in phased batches by region. Order: Contact → Subsidy_Application__c (historical, status = Closed) → Assessment__c → attachments (PDFs as ContentDocument).
5. **Cutover per region** — 4-week dual-run parallel with TAMS; in-flight applications stay in TAMS to complete; after cutover, TAMS is read-only.

**Risks / opens:** G1001 (dedup + PDF text-extraction), G1002 (office-specific customization).

### E11 — Reporting & Analytics (M)

Operational dashboards for Assessors (my queue, SLA breaches) and Managers (regional throughput, escalation count, practitioner acceptance rate) built as standard Reports + Dashboards. Executive KPIs (subsidies granted per region, rejection reasons, cycle time) surfaced in CRM Analytics if standard reports hit LDV limits. All reports honor row-level security; med-history-derived fields are excluded from any internal-facing report.

**Risks / opens:** G1101.

### E12 — Platform Foundation & DevOps (L)

- **Org strategy** — F1 (open on G0904).
- **Sandboxes** — Full (release rehearsal), Partial (system testing with sampled data), Developer Pro × N (feature branches).
- **DevOps** — SFDX source control in GitHub, CI via Copado or GitLab CI, unlocked packages for the custom object families where feasible.
- **LDV design** — skinny tables on Subsidy_Application__c, selective indexes on Status + Region + Created_Date; Big Object archival for applications closed > 3 years; heartbeat monitoring for HIC and assignment queue depth.

**Risks / opens:** G0904 (biggest fork), G1201 (NFRs).

### E13 — Localization & Regional Configuration (S)

Translation Workbench with target languages enabled per region. Email Templates versioned per language, keyed by Contact.Language_Preference__c. Business Hours per region (drives E04's 3-business-day clock and E05's 15-day escalation). Chat routing includes language skill (E07).

---

## Architecture forks the client must resolve before delivery

These forks are load-bearing and change the design if answered differently than the strawman:

1. **F1 / G0904 — Single global org vs per-region orgs.** Residency answer decides.
2. **F2 / G0101 — Clouds and license mix.** Partner Community × 4,000 is a material commitment.
3. **E03 / G0301, G0302 — HIC SLA + payload.** Retry policy and prefill mapping depend on the real contract.
4. **E04 / G0401, G0402 — Practitioner auth + assignment fairness.** "Closest distance" alone is under-specified.
5. **E06 / G0601 — Subsidy amount decision-support tool.** BRE, Flow, or reference table.
6. **E09 / G0901, G0902, G0903 — PHI classification + audit exceptions + Shield.** The "internal users never see" rule likely needs an exception path.
7. **E10 / G1001 — Migration data quality.** Dedup approach and PDF extraction feasibility drive migration effort.

Recommend a Discovery-Deep sprint to close these before Design Lock.

---

## Sizing summary

| Epic | Size | Note |
|------|------|------|
| E01 Patient Onboarding & Portal | L | LWR + wizard + async prefill + i18n |
| E02 Subsidy Application Lifecycle | L | LDV-aware, 1M/year |
| E03 HIC Integration | M | Async pattern, one integration |
| E04 Practitioner Community & Assignment | **XL** | 4,000 partner users + geo + SLA reassign |
| E05 Digital Assessment & Escalation | M | Replaces PDF flow |
| E06 Review, Approval, Subsidy Determination | L | Service Console + approval + calc |
| E07 Chat & Deflection | M | Standard patterns, two surfaces |
| E08 Identity & Auth | L | 3 ADs + social + partner path |
| E09 Data Security & PHI Model | L | Apex-managed sharing + Restriction Rules |
| E10 Data Migration | **XL** | 3.5M patients × 30 sources |
| E11 Reporting & Analytics | M | LDV-aware |
| E12 Platform Foundation & DevOps | L | Org fork + LDV + DevOps |
| E13 Localization | S | Translation Workbench |

XL count: 2 (E04, E10). Both are the load-bearing complexities; the deal's risk sits here.
