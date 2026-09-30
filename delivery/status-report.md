---
title: PTSF Patient Travel Support — Status Report
authored: 2026-09-30
period: Cumulative (engagement inception → 2026-09-30)
---

# Status Report

## Executive summary
**Overall status: GREEN.** All 20 planned intents delivered; metadata deployed to sandbox; automated test coverage green (39/39); 15 delivered intents carry 👁 manual sign-offs pending human validation (surfaced, not gated). Two build defects surfaced and fixed this cycle; one governed scope refinement (INT-008) recorded.

## Delivery metrics

| Metric | Value |
|---|---|
| Intents delivered | 20 / 20 |
| Metadata components deployed | 203 |
| Apex test pass rate | 39 / 39 (100%) |
| Org-probe assertions verified | All ✅ criteria — evidence under `intents/INT-NNN/verify-evidence/` |
| Manual sign-offs complete | 0 / 30 pending criteria (5 delivered intents fully signed via CI + auto-cover) |
| Decision records | 24 (last: 2026-09-30, INT-008 lock scope narrowed) |
| CI gate status | Green — validate, drift, coverage all pass |

## Delivered this cycle
- Bug fix — HIC platform event required-field regression (`2c892b6`)
- Governed refinement — INT-008 `Locked_After_Submission` scope narrowed to unblock INT-010 SLA reassignment (`ebad0ca`)
- Org-probe verification — INT-007 (Named Credential), INT-010 (Assignment SLA Flow), INT-011 (Assessment__c object) all green in the sandbox
- Test-script proof_hash regen across 9 drifted intents
- 5 unpointed 📋 accepted-gap rows converted to properly-parseable pointed gaps
- Seed data loaded — 6 test Contacts, 5 Subsidy Applications, 1 Assignment
- Tester walkthrough — `delivery/test-plan.md` + Word checklist `delivery/PTSF-Manual-Tests.docx`
- Governance docs — Project Charter, RAID Log, RACI Matrix

## Milestones

| Milestone | Target | Status |
|---|---|---|
| Phase 1 (Foundation) deployed | — | ✅ Done |
| Phase 2 (Patient + HIC) deployed | — | ✅ Done |
| Phase 3 (Practitioner) deployed | — | ✅ Done |
| Phase 4 (Business logic) deployed | — | ✅ Done |
| Phase 5 (Migration) deployed | — | ✅ Done |
| Manual test sign-offs complete | Cutover -14d | 🟡 Pending |
| IdP metadata received (INT-002) | Cutover -21d | 🔴 Not received |
| Facebook Dev App configured (INT-003) | Cutover -14d | 🔴 Not started |
| HIC vendor endpoint enablement | Cutover -7d | 🔴 Blocked on Q-007-1 |
| AMER pilot cutover weekend | TBD | 🔴 Not scheduled |
| EMEA cutover | AMER + 4 weeks | 🔴 Not scheduled |
| APAC cutover | EMEA + 4 weeks | 🔴 Not scheduled |

## Risks (top 3)
See `delivery/raid-log.md` for the full list.

1. **HIC vendor payload spec open (Q-007-1)** — HIGH impact; mocked tests prove mechanism but not the real contract. **Mitigation:** Named Credential + placeholder endpoint deployed; retry logic proven; enablement is a runbook step.
2. **IdP metadata not received** — HIGH impact on INT-002 acceptance; JIT handler is built and ready. **Mitigation:** escalate to PTSF IT for regional AD metadata + certificates.
3. **30 manual sign-offs pending** — MEDIUM impact; tester walkthrough + Word checklist ready. **Mitigation:** 15 items are doable now in the sandbox; the rest are blocked on persona provisioning / external systems.

## Next steps
1. Trusted Guide + Salesforce Admin work Section A of `PTSF-Manual-Tests.docx` (15 items, ~1 day)
2. PTSF IT: provide EMEA/AMER/APAC AD IdP metadata + certs
3. PTSF Marketing: create Facebook Dev App + share credentials
4. HIC vendor: confirm payload spec (`Q-007-1`) — unblock INT-007-C9
5. Schedule AMER pilot cutover weekend once external blockers clear

## Blockers
- PTSF IT to provide IdP metadata (INT-002, INT-005)
- PTSF Marketing to provide Facebook Dev App (INT-003)
- HIC vendor payload spec (INT-007)
- Cutover weekend calendar (INT-018)

## Team

| Role | Person |
|---|---|
| Trusted Guide / Architect of record | Prashant Kumar |
| AI builder | Claude Opus 4.7 (1M context) |
| Target org | ptsf-lab sandbox (`epic.out.e68d765f4115@orgfarm.salesforce.com`) |
| Repo | https://github.com/kumarprashant-byte/AI-Cohort-PTSF-Labs |
