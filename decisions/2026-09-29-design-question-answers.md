# Answer two open questions surfaced during the phase-1 design pass

**Date:** 2026-09-29 · **Decider:** Prashant Kumar

## Context

`/ql-design-intent` drafted `design.md` for INT-001, INT-004, INT-009, and INT-019 in one sitting. Two of the open questions carried on intents were *settled by the design act itself* — not by new external information, but by the concrete platform call the design records. The Trusted Guide ratified both design records; this decision folds the settled answers back into the source intents so the questions no longer read as open on future `/ql-vet-intent` passes.

Both edits touch only the `## Open questions` section — hashed-excluded, so neither trips `drift` on the intent's scope hash. No prior ratification is invalidated.

## Choice

Two answers, routed via `/ql-refine-intent` in one sitting (causally one design act):

- **Q-001 (INT-001) — ANSWERED: INT-010 owns the SLA math.** The three regional `BusinessHours` records this intent seeds are consumed by **INT-010** (3-business-day accept-or-reassign SLA), whose Scheduled Flow uses them to compute business-hours elapsed on an `Assignment__c` between `Assigned_Date` and either `Accepted_Date` or NOW(). INT-001's design surfaced this while walking the downstream cone; no separate SLA intent is warranted. Assessment lifecycle SLAs (a possible future INT-014-adjacent intent) would consume the same records if defined — non-blocking.

- **Q-019-1 (INT-019) — ANSWERED: `Assignment__c.OwnerId` = the Practitioner User.** Not a separate `Practitioner__c` lookup. INT-009's design chose OwnerId for three reasons documented there: (a) standard "My Assignments" community list view works out of the box, (b) standard sharing (owner sees their own record) covers community visibility without a manual share on Assignment__c itself, (c) reassignment is a clean owner change. INT-019's trigger reads `Assignment.OwnerId` to identify the Practitioner User for the manual Medical_History__Share insert; INT-004's Restriction Rule is unaffected (Practitioner Community users aren't in the internal-profile blocklist).

## Consequences

- **INT-001 and INT-019 are both ⬜ Not started** — no drift consequence, no `reverify` action. The scope hash on both is unchanged (open-questions text is excluded from the hash), so their existing ratifications (INT-001: `268745afcc83`; INT-019: `67b23cf17f93`) remain valid.
- **`/ql-vet-intent` will no longer flag Q-001 or Q-019-1** on the next pass — both now read ANSWERED with pointers to the settling design records.
- **INT-010's build depends on the answer to Q-001 landing here** — its Scheduled Flow will `SELECT` the correct `BusinessHours` record by region. When INT-010 reaches `/ql-design-intent`, that read is now grounded.
- **INT-009's design bears the load-bearing call** (`Assignment.OwnerId` = Practitioner User); an architecture decision record co-located with its design ratification is warranted separately (`decisions/2026-09-29-int-009-architecture.md` — deferred, not written by this record).
- **Remaining open questions on the phase-1 cluster** — Q-004-1 (PHI classification matrix authoring source), Q-005-1 (which profiles get regionalized), Q-009-1 (distance tie-breaker), plus the `Q-design-*` questions raised in the design pass — all remain open and blocking on Trusted Guide / stakeholder input; they are **not** absorbed by this record.
- **No systematic Scopezilla defect** surfaced by this act — Scopezilla correctly carried both questions as open at scoping time; they're the sort of question a design pass is *supposed* to settle.
