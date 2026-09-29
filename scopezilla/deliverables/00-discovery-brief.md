# PTSF — Discovery Brief

## Executive Summary

The Patient Travel Support Foundation (PTSF), a Singapore-headquartered not-for-profit operating across APAC, EMEA, and AMER, is consolidating 30 satellite offices' worth of bespoke Travel Application Management Systems (TAMS) onto Salesforce. The scoped platform must serve 5M+ patients (growing 50%/year), 4,000 external Medical Practitioners, and ~500 internal Assessors/Managers across three regions, running ~1M subsidy applications per year at steady state. The engagement's shape is a multi-cloud Salesforce implementation with an Experience Cloud patient portal, a partner-community-style practitioner surface, Service Cloud for assessors, integration with a slow (up to 15s) Health Insurance Checker, cross-region SSO into three separate Active Directories, and strict PHI-style visibility on medical history.

## Company and Industry Context

- **Sector:** Healthcare-adjacent not-for-profit — travel subsidy provider for patients accessing treatments not available locally.
- **Scale:** 3.5M patients today; 5M target; 50% growth/year forecast for 5 years. ~20% of patients apply for a subsidy annually → ~1M applications/year at target scale.
- **Footprint:** HQ Singapore. Three regions (APAC/EMEA/AMER), each with 10 satellite offices that receive, approve, and book applications.
- **Regulatory context (assumed, not stated in brief):** medical history + cross-region personal data implies PDPA (Singapore), GDPR (EMEA), HIPAA-adjacent (AMER). Flagged as Open Question.

## Current vs. Target Salesforce Landscape

**Current systems**

| System | Nature | Constraint |
|--------|--------|------------|
| TAMS | Bespoke, per-office customized | Doesn't scale; office-level fragmentation |
| Static website | HTML + PDF forms + FAQs | No transactional capability |
| Regional Active Directory (×3) | Per-region auth | Must be preserved as the internal-user IdP |
| Health Insurance Checker (HIC) | Global API | Up to **15s response at peak** |

**Target on Salesforce** (working assumptions — Open Questions #1)

- Experience Cloud site for Patients (public + authenticated) — self-service onboarding, application, chat.
- Experience Cloud (Partner) or Customer Community Plus for the 4,000 Medical Practitioners — assignment inbox, digital assessment forms.
- Service Cloud for internal Assessors/Managers — application queues, approval, subsidy determination, escalations.
- Einstein Bots + Knowledge for support deflection.
- Messaging (In-App/Web) or Chat for live-assessor conversations.
- Data Cloud / Shield Platform Encryption for PHI (medical history) — TBC.

## Scope and Objectives

1. **Patient onboarding** — self-service account (email/pw + Facebook), guided wizard, prepopulation from HIC, address validation, localized welcome email, blocking gate on incomplete profiles.
2. **Subsidy application** — 500+ treatment types; capture reason + medical history; verify prior medical history at each application; auto-reject when HIC indicates provider covers travel; auto-assign nearest practitioner registered for that treatment type; 3-business-day accept-or-reassign SLA.
3. **Live chat + deflection** — Patients and Practitioners can chat with an Assessor; common queries deflected.
4. **Digital assessment** — replace the current PDF-email-scan process with an in-platform digital form for Practitioners; support Practitioner-requested additional specialist assessments.
5. **Escalation** — 15-day-pending assessments escalate to Team Managers.
6. **Approval + amount** — Assessor grants subsidy; system supports determination based on distance and transport type(s).
7. **Migration** — All patients, historical applications, and assessments migrate; in-flight applications remain in TAMS until closed (~1 month cycle).
8. **Visibility** — Practitioners see limited patient PII; medical history is visible **only while an assessment is open and assigned to them**. Internal users **never** see medical history.

## Data & Compliance

- **Volumes:** 5M patients (target), ~1M applications/year, similar order of magnitude in assessments — large-object considerations (skinny tables, LDV shard keys, archiving policy needed).
- **Migration:** legacy TAMS export → staged load; assessments and applications historically stored as PDFs may require OCR or attachment-only ingest.
- **Cross-region residency:** brief is silent. Whether EMEA data may cross to a Singapore org, or whether region-specific orgs are required, is a load-bearing open question.
- **Retention & audit exceptions:** if internal PTSF users "never see medical history at all," legal-hold / audit / incident response likely need an exception path — Open Question.

## Ratified Design Premises (from Adaptive Interview)

Three load-bearing decisions confirmed with the user upfront:

1. **HIC integration is asynchronous.** Platform Event / Queueable Apex with a pending state; UI does not block on the 15s call at peak. Retry + timeout policy required.
2. **Practitioner auto-assignment is Apex + Geolocation + Scheduled Flow.** Geolocation fields on Practitioner and Patient; Apex trigger on Subsidy Application insert selects nearest practitioner registered for the treatment type; a Scheduled Flow reassigns when the 3-business-day acceptance window lapses. Requires per-region business-day calendars.
3. **Medical History is a separate object with Private OWD.** Sharing is Apex-managed with per-assignment TTL — a sharing row is created on assignment accept and removed on assignment close. Restriction Rules deny visibility to internal profiles even for admins.

## Research Findings & Market Context

Not researched externally in this pass — the brief is internally coherent and PTSF is a fictional lab scenario. If needed, comparable public benchmarks come from patient-navigator programs and NGO travel-assistance funds (Direct Relief patient support, Angel Flight logistics, Rare Disease patient-travel programs). Not carried into scope.

## Open Questions

Grouped for the client conversation.

### Solution shape (blocking for design)

1. **Which Salesforce clouds / license mix is approved?** The brief says "Salesforce platform." Confirm Experience Cloud edition, Service Cloud, Health Cloud (yes/no), Data Cloud (yes/no), Einstein Bots, Messaging.
2. **Practitioner authentication.** 4,000 external users — federated ID, self-registration with vetting, or admin-provisioned? Which IdP if federated?
3. **Chat channel.** Messaging for In-App/Web, Chat, or another channel? Both patient and practitioner surfaces?
4. **Address validation service.** Google Maps? Loqate? Melissa? PTSF preference?
5. **Subsidy amount decision-support.** Rules engine (Business Rules Engine), Flow-based lookup, or manual reference table?
6. **Payment/disbursement.** How does PTSF actually pay the subsidy after approval? Out of scope for Salesforce, or an integration point?
7. **Escalation channel at 15 days.** Task, Case, notification, or email to Team Manager? Are escalations routable / assignable / SLA'd?

### Data & compliance (load-bearing on architecture)

8. **Data residency.** Must EMEA data stay in-region? Is a single global org acceptable, or are region-specific orgs required?
9. **PHI classification & audit exceptions.** How is medical history classified (HIPAA/PDPA/GDPR)? Retention policy? Are there legal-hold, incident-response, or audit paths that must access medical history despite the "internal users never see" rule?
10. **Shield vs. Classic Encryption.** Is Shield Platform Encryption in scope for medical history?
11. **Migration data quality.** Are the 3.5M patient records de-duplicated across offices? Are historical PDF assessments text-extractable, or attachment-only?
12. **Practitioner tie-breakers & capacity.** When multiple practitioners tie on distance, or the closest is on leave / overloaded, how do we break ties? Is there a hard capacity limit per practitioner?
13. **"Business day" definition.** Practitioners span three regions with different public holidays; whose calendar governs the 3-business-day SLA — practitioner's, patient's, or PTSF's satellite office?

### Non-functional

14. **HIC SLA and rate limits.** Is 15s a p99 or p50? Are there call-volume ceilings we could hit with 1M applications/year?
15. **Patient portal SLOs.** Target page-load and uptime for the patient-facing surface — especially critical during health emergencies?
16. **Search & discovery.** Treatment-type picker (500+ values) — flat picklist or hierarchical? Which treatment metadata does the practitioner see?

### Program

17. **Timeline / go-live target.** No dates in the brief — is there a fiscal / regulatory driver?
18. **Budget envelope.** Not stated.
19. **Success metrics.** What does "the new system is working" look like in month 3 / month 12?
20. **Change-management footprint.** 30 satellite offices with bespoke TAMS workflows — is there office-specific customization we must preserve, or is process harmonization part of the goal?

## Recommended next step

Proceed to `requirements` to shape the epics on the confirmed scope; carry the Open Questions forward as gaps against the epics that depend on them.
