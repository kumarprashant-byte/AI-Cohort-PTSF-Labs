# Grill session — reconcile ⚠️ vet findings + F5 undeclared deps on the phase-1 PHI/regional cluster

**Date:** 2026-09-29 · **Deciders:** Prashant Kumar

## Context

`/ql-vet-intent` (per INT-001/004/005/019/020) surfaced ⚠️ readiness findings; the earlier `/ql-analyze-intents` sweep (`decisions/2026-09-29-analyze-intents-sweep.md`) surfaced F5 — a systemic pattern of undeclared internal dependencies across ~9 intents. The overlap on the phase-1 PHI + regional cluster (INT-004, INT-005, INT-019, INT-009) means one sitting resolves both. This session **caps to that cluster**; the remaining F5 items on INT-008 and INT-011–017 are deferred to a phase 2/3 grill.

Sources grounded against: in-repo `scopezilla/` mirror + the living intents. No transcripts, discovery notes, or upstream Scopezilla project opened — scrub-verify pass **not needed** (no dirty source read; the membrane's conditional trigger did not fire).

## Choice

Seven ratified edits, all routed inline (the sitting drove the diffs; per-intent decision records are folded into this session record rather than fragmented — the edits are causally one call):

- **INT-004 / E1** — added `Q-004-1` on where the PHI classification matrix is authored. The Shield encryption bullet leans on it; honest silence rather than an invented reference.
- **INT-004 / E2** — appended to the Audit_Log__c build-target bullet: engagement-wide audit sink; downstream intents (INT-019 break-glass share writes, others) write to it. Makes the shared-object contract explicit.
- **INT-004 / E3** — declared `INT-005` under `### Internal`: the Compliance Officer role/profile the 'PHI Emergency Access' permission set is assigned to sits in the regional user model.
- **INT-005 / E4** — added `Q-005-1` on which profiles get regionalized. The Profile × Region PSG matrix isn't buildable until this is settled.
- **INT-019 / E5** — sharpened the Apex-trigger bullet: the Practitioner User is identified via the Assignment__c ownership field (INT-009 owns the field's shape); added `Q-019-1` naming the OwnerId-vs-Practitioner__c-lookup question that INT-009's design will settle.
- **INT-019 / E6** — added a build-target bullet for the 'Practitioner Medical History Read' permission set (object + FLS on Medical_History__c). The manual share grants row access; this grants the base object/field access needed to render the community page. Guardrails preserved.
- **INT-009 / E7** — declared `INT-004` and `INT-005` under `### Internal`: INT-004 for the Medical_History__c object the community record page's related list depends on, INT-005 for Contact.Region__c that drives the region guardrail on selection. The intent's prose already referenced INT-004 ("visible only via INT-004's sharing") — this closes the F5 undeclared-dep gap.

## Consequences

- None of INT-004, INT-005, INT-009, INT-019 are ✅ Delivered — no `drift` / `reverify` action. INT-019 is ⬜ Not started, INT-009 ⬜ Not started, INT-004 and INT-005 ⬜ Not started per the ledger.
- New scope hashes on INT-004, INT-005, INT-009, INT-019 (all four had hashed-field edits — build target, Internal deps, or the Q-xxx question count doesn't affect the hash but the build-target/dep edits do). None had a prior ratification; no stale-ratification flag is triggered by this sitting.
- Q-004-1, Q-005-1, Q-019-1 are now blocking questions carried on their intents; `/ql-vet-intent` will surface them until answered. Q-019-1 is naturally settled by `/ql-design-intent INT-009`.
- The remaining F5 undeclared-dep sweep — INT-008, INT-011, INT-012, INT-013, INT-014, INT-015, INT-016, INT-017 — is **deferred to a phase 2/3 grill sitting**, not silently absorbed here. Named so it doesn't fall out of view.
- No systematic Scopezilla defect surfaced this sitting — the undeclared-dep pattern is a scoping-time gap the human closed in-repo, not an upstream defect worth flagging to `scoping-agent`.
