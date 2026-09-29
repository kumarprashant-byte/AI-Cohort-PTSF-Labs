# PTSF — Delivery Plan (Phased Roadmap)

Functionality-over-time roadmap for the PTSF Salesforce program. Team shape (who and how many) is not covered here — that's the `estimate` skill's output (`resource-plan.json`).

**Timeline mode:** No commitment. The brief carries no fixed go-live, and the client hasn't set a target — phases are sequenced only. When PTSF gives a target, we can either match it (routing back through `roadmap`) or derive a benchmark-based range from the engagement shape.

---

## Phase 0 — Discovery-Deep & Architecture Lock

**Objective.** Close the load-bearing open forks *before* Design Lock so the build isn't rearchitected mid-flight.

The scope has ~25 open questions from the discovery brief. Not all are gating — but this bundle is:

- **F1 / G0904** — Single-global-org vs per-region orgs (residency).
- **G0101** — Approved Salesforce clouds and license mix (Partner Community × ~4,000 is a material spend line).
- **G0301 / G0302** — HIC SLA (p50/p99), rate limits, and payload contract.
- **G0401** — Practitioner authentication method.
- **G0601** — Subsidy-amount decision-support mechanism (BRE vs Flow vs table).
- **G0901 / G0902 / G0903** — PHI classification, audit/legal-hold exception path, Shield.
- **G1001** — Migration data-quality baseline (2–3 sample TAMS profiling).

**Exit criteria.** Signed ADRs, license order placed, HIC contract with SLAs, migration profiling report, PHI classification matrix, compliance signoff on the Restriction Rule + break-glass design.

Skipping or under-resourcing Phase 0 is the single biggest program risk — particularly the org-strategy fork, which if it flips to per-region orgs makes E04 (assignment) a cross-org integration.

## Phase 1 — Platform Foundation, Identity & PHI Security

**Delivers:** E12 (Platform Foundation & DevOps), E08 (Identity), E09 (Data Security & PHI Model).

**Why first.** Every other phase writes into or reads from records governed by the security model. Getting Medical_History__c's OWD + Apex-managed sharing + Restriction Rules verified end-to-end in isolation is far cheaper than retrofitting after E01 and E02 have written data. Identity has three federations to stand up plus social plus a partner path — that's not overnight work.

**Success:** Sandboxes stood up, CI/CD flowing, all three regional ADs authenticated, patient login (email/password + Facebook) working in a lower env, Medical_History__c sharing lifecycle proven with a demo assignment, Restriction Rules blocking a Salesforce Administrator (test case: even View All doesn't reveal history).

**Risk:** The compliance signoff on break-glass is often slower than the code. Start it in Phase 0.

## Phase 2 — Patient Journey MVP

**Delivers:** E01 (Onboarding & Portal), E02 (Application Lifecycle), E03 (HIC Integration), E13 (Localization foundations).

**Why here.** First externally visible business value — a patient can go from unregistered to submitted application, and PTSF can start seeing new-system-versus-TAMS volume shift. Async HIC pattern proven in the wizard is the same pattern reused for entitlement check on submission.

**Success:** A patient in each of the three regions can register, complete onboarding, submit an application in their language, and see the 'HIC-check pending' → 'awaiting practitioner' transition. Auto-reject fires when HIC indicates insurance covers travel.

**Risk:** HIC latency has to be *truly* non-blocking. Load-test the wizard under simulated 15s HIC delays; the correctness bar is that the user can continue the wizard while the callout is outstanding.

## Phase 3 — Practitioner Community & Assignment

**Delivers:** E04 (Practitioner Community & Assignment), E05 (Digital Assessment & Escalation).

**Why here.** With patients able to submit applications, the assignment fabric can be turned on. This is the most complex epic pair in the program — 4,000 external partner users + geolocation-based selection + a per-region business-day SLA + reassignment logic.

**Success:** End-to-end in a lower env — application submitted → practitioner selected by DISTANCE() within the treatment specialty → practitioner accepts or lapses → reassignment fires on the business-day boundary → digital assessment completed → 15-day escalation demoed.

**Risk (organizational, not build):** Onboarding 4,000 practitioners onto a new portal in three regions is a change-management program in its own right. Consider a phased rollout by region, or by treatment-type cohort, to de-risk adoption. Assignment tie-breakers (G0402) must be resolved before this phase can build.

## Phase 4 — Assessor Review, Approval & Support

**Delivers:** E06 (Review, Approval & Determination), E07 (Chat + Deflection), E11 (Reporting).

**Why here.** Assessments now exist to review, and the Service Console can be built against a real data flow. Chat comes online once both public surfaces (patient + practitioner) are live to attach to. Reporting piggybacks on the now-stable data model.

**Success:** Assessor works an application end-to-end in Service Console (never seeing medical history), invokes the determination Flow, submits for approval where required. Chat is on both surfaces with Einstein Bot deflection. Regional Ops sees a dashboard of cycle-time and SLA metrics.

**Risk:** LDV pressure on reporting at 1M applications/year — decide early whether standard Reports scale or a CRM Analytics tile is needed.

## Phase 5 — Data Migration & Regional Cutover

**Delivers:** E10 (Data Migration).

**Why last.** Migrating into a target system that's still moving is expensive rework. The target has to be stable — data model, security, workflows — before real historical data flows in. Phase 5 also carries the risk of the whole cutover event, which is best tackled with a hardened platform.

**Approach:** Per-region cutover with a 4-week dual-run parallel to TAMS. In-flight applications stay in TAMS (they finish in ~1 month by their own dynamic). Order of regions is a business decision — recommend starting with the smallest region as a de-risker.

**Success:** Each region cuts over on plan, with reconciliation reports proving completeness and integrity. TAMS becomes read-only per region as cutover completes.

**Risk:** Dedup across the 30 TAMS instances is the biggest data-quality risk. PDF-only historical assessments may need OCR; if the volume is large, decide in Phase 0 profiling whether OCR is in scope or attachments are migrated as-is.

---

## Dependency map

```
Phase 0 (Architecture Lock)
   ↓
Phase 1 (Foundation + Identity + Security)
   ↓
Phase 2 (Patient Journey MVP)  ────►  chat surface (E07) becomes available in P4
   ↓
Phase 3 (Practitioner + Assessment)  ────►  assessment data ready for P4
   ↓
Phase 4 (Assessor Review + Chat + Reporting)
   ↓
Phase 5 (Migration + Regional Cutover)
```

## What's not in this roadmap

- **Team shape and headcount.** That's `estimate`'s job — role, seniority, count per phase, with justification.
- **Committed durations.** No fixed timeline on the client side; if one is given, we'll re-run this skill to attach `duration_weeks` per phase, or derive a benchmark-based range from the engagement shape.
- **Pricing.** Runs in `commercials` on a validated rate; no numbers exist here.

## Open items that affect this roadmap

- G0904 (residency) — if per-region orgs, Phase 1 forks per region and Phase 3 becomes an integration.
- G0401 (practitioner auth) — self-registration-with-vetting adds a Phase 1 workstream if that's the path.
- G0603 (payment integration) — if in scope, adds an epic to Phase 4.
- Any hard external go-live date PTSF sets — could compress Phase 0 into Phase 1 (risky) or force scope-cut modeling.
