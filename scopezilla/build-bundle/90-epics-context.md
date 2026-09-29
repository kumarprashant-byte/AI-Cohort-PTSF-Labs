# Epics — Context Only — PTSF Patient Travel Support

> Reference role: **background**, not load-bearing. The phase briefs are authoritative. This file dereferences epic IDs cited in phase briefs (e.g. `(E01)`) and provides scoping-stage context for trade-off reasoning.
>
> Do not plan against epics. Plan against `10-phase-N.md`.

## E01: Patient Onboarding & Portal
Public-facing patient registration (email/password + Facebook), first-login onboarding wizard capturing personal profile, HIC-prefill, address validation, gated access to subsidy applications until profile complete, localized welcome email in preferred language. Delivered on Experience Cloud (LWR).

_Confidence: Confirmed_

## E02: Subsidy Application Lifecycle
End-to-end application object model and lifecycle: create/edit application, treatment-type selection (500+), reason capture, medical-history re-verification, submission, status tracking, patient-side visibility. Feeds practitioner assignment (E04) and assessor review (E06).

_Confidence: Confirmed_

## E03: Health Insurance Checker Integration
Asynchronous integration with the global HIC API (Platform Event / Queueable Apex). Prefill onboarding, verify entitlements at application submission, auto-reject applications where the HIC indicates travel is covered. Handles up-to-15s peak latency without blocking UI; retry, timeout, and idempotency policy.

_Confidence: Confirmed_

## E04: Medical Practitioner Community & Assignment
Partner Experience Cloud community for 4,000 external practitioners: registration, treatment-type specialties, geolocation, assignment inbox. Apex-based auto-assignment on application insert (nearest practitioner registered for the treatment type). Scheduled Flow reassigns after 3 business days if no acceptance. Business-day calendar per region.

_Confidence: Confirmed_

## E05: Digital Assessment & Escalation
Replace the PDF-email-scan flow with an in-platform digital assessment form for practitioners. Support practitioner requests for additional specialist assessments. Escalate assessments that remain 'pending' 15 days after assignment to Team Managers.

_Confidence: Confirmed_

## E06: Application Review, Approval & Subsidy Determination
Assessor console (Service Cloud) for reviewing applications and assessments, approving/rejecting, entering subsidy amount. Decision-support for subsidy amount based on distance and transport type. Managerial approval hierarchy for higher-value subsidies.

_Confidence: Confirmed_

## E07: Chat, Messaging & Support Deflection
Live chat between Patients/Practitioners and PTSF Assessors. Einstein Bots + Knowledge for common-question deflection. Channel selection TBC (Messaging for In-App/Web candidate).

_Confidence: Assumed_

## E08: Identity & Authentication
Internal user SSO to three regional Active Directory instances (federated, per-region IdP). Patient login (email/password + Facebook social sign-on). Practitioner authentication method (federated or self-registration with vetting) — TBC.

_Confidence: Assumed_

## E09: Data Security & PHI Visibility Model
Medical History as a separate object with Private OWD. Apex-managed sharing granted on assignment acceptance and revoked on assignment close (TTL model). Restriction Rules deny visibility to internal PTSF profiles. Field-level security, encryption evaluation (Shield). Cross-region residency model TBC.

_Confidence: Confirmed_

## E10: Data Migration from TAMS
Migrate patients, historical subsidy applications, and assessments from 30 satellite-office TAMS instances. Dedup across offices. In-flight applications remain in TAMS to complete (~1 month). Cutover strategy: dual-run vs. big-bang per region.

_Confidence: Confirmed_

## E11: Reporting & Analytics
Operational dashboards for Assessors/Managers (applications by region/treatment, cycle times, escalations, practitioner acceptance rates). Executive KPIs for the leadership team. Volume-aware design given 1M applications/year.

_Confidence: Assumed_

## E12: Platform Foundation & DevOps
Org strategy (single global org vs per-region — see G0904), sandboxes, DevOps toolchain, release management, monitoring, LDV strategy (skinny tables, archiving) for the 5M-patient / 1M-application-per-year data volume.

_Confidence: Assumed_

## E13: Localization & Regional Configuration
Translation Workbench for UI labels, patient-preference-driven email templates, per-region business-day calendars, per-region satellite-office data model, language-preference propagation to chat routing.

_Confidence: Assumed_

---

## Estimates and complexity drivers

These T-shirt sizes are scoping-stage planning estimates. They are **not** build instructions — the build agent should plan against the per-phase briefs, not against epic size. Sizes are included here for context only.

| Epic | T-shirt | Complexity drivers | Risks |
| --- | --- | --- | --- |
| E01: Patient Onboarding & Portal | L | Onboarding wizard, HIC prefill mapping, Facebook social sign-on, address validation service, gating logic, localized welcome email templates | Address-validator vendor selection open (G0102); HIC prefill field mapping open (G0302); gating logic must be reliable to protect downstream data quality |
| E02: Subsidy Application Lifecycle | L | 500+ treatment picker (structure TBC — G0201), medical history re-verification against prior submissions, submission → HIC-check → assignment lifecycle, patient status visibility | Treatment picker performance at 500+ (G0201); LDV design must be right first time given volume |
| E03: Health Insurance Checker Integration | M | Async pattern (Platform Event → Queueable), 15s peak latency, retry with exponential backoff, idempotency key, auto-reject rules on entitlement response, error monitoring | HIC rate limits unknown (G0301); payload schema unconfirmed (G0302 — strawman only) |
| E04: Medical Practitioner Community & Assignment | XL | Partner Experience Cloud community for 4,000 practitioners, geolocation on Contact + Address geocoding, Apex trigger with DISTANCE()-based selection filtered by treatment specialty, Scheduled Flow reassignment on 3-business-day lapse, per-region business-day calendars | Practitioner authentication method (G0401); assignment tie-breakers + capacity + leave (G0402); business-day calendar per region (G0403); 4,000 Partner Community licenses is material commercial line |
| E05: Digital Assessment & Escalation | M | Digital assessment form (LWC or OmniStudio TBC), additional-specialist request mechanism, 15-day-pending escalation to Team Managers | Escalation channel design (G0501 — Task vs Case vs notification); OmniStudio decision affects licensing |
| E06: Application Review, Approval & Subsidy Determination | L | Service Console for Assessors, subsidy amount calculator (distance × transport type × multipliers), approval process by amount threshold, managerial approval hierarchy | Decision-support mechanism (G0601 — BRE vs Flow); approval thresholds + hierarchy (G0602); payment integration boundary (G0603) |
| E07: Chat, Messaging & Support Deflection | M | Live chat between users and PTSF Assessors; Einstein Bot flows for common questions; Knowledge base articles | Channel choice not confirmed (G0701) — Messaging for In-App/Web assumed. Digital Engagement licenses add commercial line. |
| E08: Identity & Authentication | L | Three separate SAML/OIDC federations to regional AD instances (routing based on user region); Facebook social sign-on for patients; practitioner auth path (federated vs self-register vetted — TBC) | Practitioner auth method (G0401); regional-AD SSO details (G0801 — protocol, attribute mapping, JIT provisioning) |
| E09: Data Security & PHI Visibility Model | L | Medical_History__c with Private OWD; Apex-managed sharing granted on Assignment acceptance and revoked on close; Restriction Rules against internal profiles; break-glass audit path; Shield decision | PHI classification (G0901); audit exception path (G0902); Shield decision (G0903); cross-region residency (G0904 — the biggest architecture fork) |
| E10: Data Migration from TAMS | XL | Extract from 30 heterogeneous TAMS instances, dedup across offices, migrate patients + historical applications + assessments (many as PDF attachments), reconciliation reporting, dual-run cutover strategy | Dedup + PDF text-extractability (G1001); office-specific customization to preserve (G1002); cutover risk with 1-month in-flight tail |
| E11: Reporting & Analytics | M | Operational dashboards (Assessor, Manager, Regional Ops) + executive KPI dashboards; volume-aware report design | Requirements not stated in brief (G1101); volume may push to CRM Analytics |
| E12: Platform Foundation & DevOps | L | Single-global-org vs per-region orgs fork (G0904), LDV design (skinny tables, selective indexes, archiving of closed applications), sandbox strategy, DevOps toolchain (SFDX, CI/CD), monitoring | G0904 is scope-shaping — if per-region orgs are required, this epic multiplies and cross-region assignment (E04) becomes an integration problem |
| E13: Localization & Regional Configuration | S | UI translation via Translation Workbench, per-language email templates, per-region business-day calendars, language-preference propagation to chat routing | Language list not specified; translation vendor process unclear |
