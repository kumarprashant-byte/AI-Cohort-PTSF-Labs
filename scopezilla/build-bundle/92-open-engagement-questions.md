# Open Engagement Questions — PTSF Patient Travel Support

> Reference role: cross-phase or engagement-level open questions only. Per-phase questions live **inside** the phase brief (under "Plan-mode questions" or "Build-mode questions"). This file exists to hold what doesn't belong to a single phase.

If this list is empty for an engagement, no file is generated — its absence means "no cross-phase questions remain."

- [ ] **G0101 — Missing Requirement**: Which Salesforce clouds and license mix are approved (Experience Cloud edition, Service Cloud, Health Cloud yes/no, Data Cloud yes/no, Einstein Bots, Messaging)?
  - Notes: Shapes E01, E04, E06, E07 architecture and license commercials.
- [ ] **G0102 — Ambiguity**: Address validation provider preference (Google Maps, Loqate, Melissa)?
  - Notes: E01 integration; small but affects licensing and per-lookup cost.
- [ ] **G0201 — Ambiguity**: Is the treatment-type picker flat (500+ picklist values) or hierarchical? Which metadata does the practitioner see per treatment?
  - Notes: E02 UX + performance; a flat picklist at 500 values hurts usability.
- [ ] **G0301 — Missing Requirement**: HIC SLA: is 15s a p99 or p50? What are call-volume ceilings? Is the API idempotent on retry?
  - Notes: E03 retry/timeout design; potential rate-limit risk with ~1M applications/year.
- [ ] **G0302 — Missing Requirement**: HIC payload schema — which fields prefill the patient profile? Which entitlement fields determine auto-reject?
  - Notes: E01 prefill mapping and E03 auto-reject logic. Confirm against actual HIC contract.
- [ ] **G0401 — Missing Requirement**: Practitioner authentication method: federated (which IdP?), self-registration with vetting, or admin-provisioned?
  - Notes: E04 + E08; determines onboarding UX and license shape (Partner Community licenses × 4,000).
- [ ] **G0402 — Logical Gap**: Assignment tie-breakers when multiple practitioners tie on distance, are on leave/vacation, or have capacity limits.
  - Notes: E04 assignment logic; 'closest distance' alone is under-specified. Needs a fairness/round-robin policy or capacity cap.
- [ ] **G0403 — Ambiguity**: '3 business days' — whose calendar governs (patient's region, practitioner's region, PTSF satellite office)?
  - Notes: E04 + E13; multi-region holiday differences affect SLA fairness.
- [ ] **G0501 — Missing Requirement**: Escalation channel at 15 days pending — Task, Case, notification, or email? Assignable and SLA'd once escalated?
  - Notes: E05 escalation mechanics.
- [ ] **G0601 — Ambiguity**: Subsidy amount decision-support: rules engine (Business Rules Engine), Flow-based lookup, or manual reference table?
  - Notes: E06; if BRE is preferred, adds license and design cost.
- [ ] **G0602 — Missing Requirement**: Managerial approval hierarchy and value thresholds — what amount triggers manager approval? Multi-level?
  - Notes: E06 approval process design.
- [ ] **G0603 — Out of Scope**: Payment/disbursement mechanism — does Salesforce integrate with a payment/AP system, or is disbursement out of scope?
  - Notes: Not in the brief. Confirm boundary.
- [ ] **G0701 — Ambiguity**: Chat channel (Messaging for In-App/Web, Chat, or another)? Both patient and practitioner surfaces?
  - Notes: E07 architecture and license mix (Digital Engagement).
- [ ] **G0801 — Missing Requirement**: SSO details per regional AD: SAML or OIDC? Just-in-time provisioning? User attribute mapping?
  - Notes: E08 SSO integration; three separate configurations.
- [ ] **G0901 — Potential Risk**: PHI classification (HIPAA/PDPA/GDPR) and retention rules for medical history.
  - Notes: E09 security architecture, Shield decision, retention automation.
- [ ] **G0902 — Logical Gap**: Audit/legal-hold/incident-response exception path — 'internal users never see medical history' likely has legitimate exceptions.
  - Notes: E09 emergency-access pattern (break-glass + audit trail).
- [ ] **G0903 — Missing Requirement**: Shield Platform Encryption in scope for medical history?
  - Notes: E09 + commercials; Shield has license and performance implications.
- [ ] **G0904 — Potential Risk**: Data residency: must EMEA data stay in-region? Is a single global org acceptable, or is a per-region org strategy required?
  - Notes: E12 org strategy — the single biggest architecture fork in this deal. Multi-org multiplies commercials and complicates 4,000-practitioner cross-region.
- [ ] **G1001 — Missing Requirement**: Migration data quality: are the 3.5M patient records deduplicated across offices? Are historical PDF assessments text-extractable or attachment-only?
  - Notes: E10 migration effort; attachment-only doubles storage and hurts search.
- [ ] **G1002 — Ambiguity**: Office-specific TAMS customization to preserve, or is process harmonization a goal of the program?
  - Notes: E10 + E12 configuration variance.
- [ ] **G1101 — Missing Requirement**: Reporting requirements: which KPIs and dashboards for Assessors, Managers, Executives? Real-time or scheduled?
  - Notes: E11 not called out in brief — inferred activity per persona rule.
- [ ] **G1201 — Missing Requirement**: Non-functional requirements: patient portal SLO (page-load, uptime), HIC concurrency ceiling, mobile support target.
  - Notes: E12; NFRs not stated beyond HIC 15s.
- [ ] **G0001 — Missing Requirement**: Timeline / go-live target — no date in the brief. Is there a fiscal, regulatory, or program driver?
  - Notes: Roadmap phasing depends on it.
- [ ] **G0002 — Missing Requirement**: Budget envelope.
  - Notes: Sizing check; not yet gated.
- [ ] **G0003 — Missing Requirement**: Success metrics for month 3 / month 12.
  - Notes: Adoption KPIs and value tracking.

---

## How to use this file

- Walk it once at engagement-start, before planning Phase 1.
- For each item, surface to the user; capture the answer; append `**Resolved:** <answer>` underneath.
- A question that turns out to be phase-specific should be moved into that phase's brief (Plan-mode or Build-mode questions section) and removed from this file.
