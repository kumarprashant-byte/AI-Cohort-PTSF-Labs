---
title: PTSF Patient Travel Support — RAID Log
authored: 2026-09-30
owner: Prashant Kumar (Trusted Guide)
---

# RAID Log — Risks, Assumptions, Issues, Dependencies

Rolling log across all 20 intents. Source of truth: `intents/INT-NNN/intent.md` (Open questions, Dependencies) + `decisions/` records + `delivery/intent-ledger.md`. This document rolls them up for stakeholder view.

## Risks

| ID | Risk | Impact | Likelihood | Owner | Mitigation | Status |
|---|---|---|---|---|---|---|
| R-01 | HIC vendor payload spec (`Q-007-1`) still open — mocked tests cover mechanism, not the real contract | High | Medium | PTSF IT / HIC vendor | Named Credential deployed with placeholder endpoint; enablement is a runbook step; retry logic already proven | Open |
| R-02 | Real IdP metadata + certs for EMEA/AMER/AD not yet supplied — INT-002 acceptance blocked | High | Medium | PTSF IT | JIT handler + SamlSsoConfig deployed; runbook `intents/INT-002/` documents plug-in | Open |
| R-03 | Facebook Dev App credentials unavailable — INT-003 patient self-registration blocked | Medium | Medium | PTSF marketing / dev | Auth provider + Experience Cloud sites are provisioned in metadata; only external app config missing | Open |
| R-04 | 15 delivered intents carry 👁 manual sign-offs pending — automated coverage confirms mechanism, humans must confirm experience | Medium | High | Trusted Guide + designated testers | Test plan (`delivery/test-plan.md`) + Word checklist (`delivery/PTSF-Manual-Tests.docx`) drafted; seed data loaded | Open |
| R-05 | Salesforce report/dashboard metadata deploys are fragile on greenfield orgs — INT-016 reports must be built in Report Builder against deployed CRTs | Low | High (materialised) | Admin / Trusted Guide | Accepted-gap C5/C8, click-through runbook `delivery/runbook-INT-016.md` | Open |
| R-06 | TAMS cutover carries 4-week dual-run risk — data drift between systems | High | Medium | Regional Ops Managers | INT-018 runbook + rollback plan; reconciliation reports INT-017 | Not started (cutover) |
| R-07 | Selective indexes on Status + Region + Created_Date deferred to Support case (INT-008-C11) | Low | Low | Salesforce Support | Accepted-gap; capstone org can't file cases; production org must | Deferred |
| R-08 | Custom Contact Duplicate Rule (INT-009) blocks re-seeding of test data with same email | Low | Certain (observed) | Test harness | Seed script now uses timestamp-tagged emails per run | Closed |

## Assumptions

| ID | Assumption | Validated? | Notes |
|---|---|---|---|
| A-01 | Target org is Sales+Service+Experience Cloud with Partner Community licenses | Yes | ptsf-lab sandbox provisioned |
| A-02 | PTSF IT owns the three regional AD IdPs and can provide metadata + certs on demand | No | Blocking INT-002-C6 |
| A-03 | Facebook Dev App exists or will be created for Patient Portal | No | Blocking INT-003-C4 |
| A-04 | System admin runs all manual sign-offs until persona users are provisioned by JIT | Yes | Confirmed by test plan approach |
| A-05 | HIC vendor will provide a REST endpoint accepting JSON, returning a JSON body with Covered/Not_Covered | No | Await Q-007-1 |
| A-06 | Report/dashboard content is admin-built at deploy time — not shipped as metadata | Yes | INT-016-C5/C8 accepted-gap |
| A-07 | 20 intents cover total scope for this engagement; no phase 6 planned | Yes | Confirmed in AGENTS.md ENGAGEMENT block |

## Issues

| ID | Issue | Severity | Discovered | Resolution | Status |
|---|---|---|---|---|---|
| I-01 | HIC_Prefill_Requested__e platform event fields Contact_Id__c + Onboarding_Id__c set `required=true` silently dropped events at INT-007 test time | Medium | 2026-09-30 | Set `required=false`; documented Salesforce platform-event silent-drop behavior | Closed (`641f55b`, `2c892b6`) |
| I-02 | INT-008 `Locked_After_Submission` validation rule blocked INT-011's SLA reassignment writing to `Previously_Declined_Practitioners__c` | High | 2026-09-30 | `/ql-refine-intent` on INT-008 narrowed guardrail 2; VR dropped that field from ISCHANGED list | Closed (`ebad0ca`, `decisions/2026-09-30-INT-008-lock-scope-narrowed.md`) |
| I-03 | `Treatment_Type__c`, `Transport_Type__c`, `Distance_Km__c` on Subsidy_Application__c lack System Admin FLS — seed script had to drop them | Low | 2026-09-30 | Fields granted via other permission sets (Assessor_Base). Sysadmin FLS backfill pending | Open |
| I-04 | `Practitioner_Contact__c` on Assignment__c lacks Sysadmin FLS — same pattern | Low | 2026-09-30 | Same as I-03 | Open |
| I-05 | Migration_Staging__c deploy failed on "Allow Sharing/Bulk/Streaming must match" error | Low | Earlier session | Set enableStreamingApi=true | Closed |

## Dependencies

### External (cross-team / cross-system)

| ID | Dependency | Provider | Needed by | Status |
|---|---|---|---|---|
| D-E1 | EMEA/AMER/APAC AD IdP metadata + certificates | PTSF IT | INT-002 acceptance test | Not received |
| D-E2 | Facebook Dev App + Auth Provider credentials | PTSF Marketing / Dev | INT-003 acceptance test | Not received |
| D-E3 | HIC vendor REST endpoint + auth (production) | HIC vendor | INT-007 production go-live | Placeholder only |
| D-E4 | TAMS export access + destination bucket | PTSF IT (source) | INT-017 migration | Runbook drafted |
| D-E5 | Partner Community license SKU allocation | PTSF procurement | INT-003 practitioner self-registration | Not confirmed |
| D-E6 | Regional business hours calendar setup | PTSF Regional Ops Managers | INT-010 SLA calculations | Deployed with defaults; regional override pending |

### Internal (between intents)

Full dependency graph is in each intent's `## Dependencies` section. Key chains:

- **Security spine:** INT-001 → INT-004 → INT-020 → INT-019 (org → PHI OWD → region sharing → practitioner MHE access)
- **Identity spine:** INT-002 → INT-005 → INT-003 (SAML JIT → role hierarchy → external logins)
- **Application flow:** INT-006 → INT-007 → INT-008 → INT-009 → INT-010 → INT-011 → INT-012 (patient wizard → HIC → lifecycle → assignment → SLA → assessment → escalation)
- **Delivery + reporting:** INT-013 → INT-014 → INT-016 (console → subsidy calc → reports)
- **Go-live:** INT-017 → INT-018 (migration → cutover)
