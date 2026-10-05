# Fill INT-023..INT-026 from the Assessment / Data / Visibility slide review

**Date:** 2026-10-05 · **Deciders:** _pending Trusted Guide ratification_

## Context

A review of the Assessment & approval, Data & migration, and Visibility & privacy slides surfaced four build gaps against the delivered scope:

- INT-011 shipped partial, with the practitioner-requested specialist-referral slice deferred (`local/INT-011+partial-per-decision-2026-09-29-INT-011-specialist-referral-deferred`).
- INT-014's build target sketched a distance × transport subsidy calculator, but left the decision mechanism open as Q-014-1 (BRE vs Flow vs lookup).
- INT-001 captured an LDV baseline (skinny table + selective indexes) but produced no scale-soak proof against the stated 5M-patient / 50%-YoY targets.
- INT-004's acceptance walked the SysAdmin-blocked positive path, but established no repeatable multi-surface denial matrix proving PTSF internal users cannot see `Medical_History__c` via API, exports, SOSL, etc.

Four draft intents (INT-023..INT-026) were scaffolded earlier in this session. This record fills them.

Touches: `intents/INT-023/intent.md`, `intents/INT-024/intent.md`, `intents/INT-025/intent.md`, `intents/INT-026/intent.md`.

## Options

For each of the four, the alternative weighed was *reopen the delivered parent intent and refine it* vs *author a fresh follow-on intent that cites the delivered parent*. The repo's "closed is closed" default (/ql-capture-intent Step 3) argues against silent reopens — reopening INT-011/014/001/004 would trip drift on four ✅ Delivered rows and conflate the delivered scope's definition with its sharpened follow-on. The follow-on-intent route keeps each delivered row stable and makes the new work independently buildable, demoable, and reviewable.

For INT-024 specifically, Q-014-1 (decision mechanism) carries forward as Q-024-1 rather than being resolved by fiat — the lookup-first default is stated in the build target as the implementation path if no decision is reached, but the Program Sponsor's call is still outstanding.

## Choice

Author INT-023..INT-026 as fresh follow-on intents, each `confidence: draft`, each citing the delivered parent it sharpens:

- **INT-023** — Practitioner-requested specialist sub-assessment (E05, phase 4): closes INT-011's merge-back loop; the parent assessment cannot move to Pending Review until every requested sub-assessment lands; reuses INT-012's 15-day escalation for aged sub-assessments.
- **INT-024** — Subsidy calculator (E06, phase 4): proposes `Proposed_Amount__c` from distance × transport; INT-014 continues to own threshold approval. Resolves gap G0601 pending Q-024-1.
- **INT-025** — LDV scale-soak (E12, phase 5): proves INT-001's baseline at 5M patients today and 7.5M (year-2 projection); flows must respect INT-004's PHI model during generation.
- **INT-026** — PTSF-internal PHI blockout proof (E09, phase 1): adds the automated denial-path matrix across record page / list view / report / dashboard / API / export / SOSL / ContentDocument, per profile; the matrix is signed by the Compliance Officer and attached to INT-004 as its delivered-security evidence.

All four are drafts awaiting the Trusted Guide's ratification; `node scripts/intent-ledger.mjs ratify INT-NNN --by "<their name>"` records it.

## Consequences

- No scope hash drift on INT-001, INT-004, INT-011, or INT-014 — they are untouched; the follow-on work rides on new intents.
- Phase 1 picks up INT-026 (one additional security-track intent); phase 4 picks up INT-023 and INT-024 (two application-track intents); phase 5 picks up INT-025 (one DevOps-track intent).
- INT-025 implies a Full Sandbox refresh window at 5M-patient volume — flagged as an external dependency on PTSF IT in the intent itself.
- Nine open questions carry across the four intents; none should block drafting, all should be resolved before build.
- Scope-side (`~/scoping-projects/ptsf-lab/data/intents.json`) carries the same four as INT-019..INT-022 — the id offset is intentional: engagement renumbering reflects engagement delivery history (INT-019..INT-022 are already delivered in the engagement from prior work), not the scoping project.
