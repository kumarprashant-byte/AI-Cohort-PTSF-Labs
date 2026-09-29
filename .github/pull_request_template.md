<!--
  Quantum Leap engagement PR template.
  This PR doubles as a testing + handoff artifact. Fill every section.
  Delete a section only if you can write "N/A — <reason>" in its place.
  Evidence legend used throughout:
    ✅ automated  — proven by a named, green test / query
    👁 manual     — requires a human walkthrough; link the step
    🔁 retest     — fix landed, awaiting re-verification (gates until re-run)
    ⚠️ partial    — mechanism proven, end-to-end not yet
    ⛔ blocked     — cannot verify until a gate clears
    📋 accepted   — closed without proving it; needs a named accepter + a pointer
-->

# <Phase / Intent> — <short title>

| | |
|---|---|
| **Phase** | <e.g. Phase 1 — Foundation> |
| **Intent(s)** | <e.g. INT-001> |
| **Epic(s)** | <e.g. E05, E03> |
| **Build org** | <alias + org id> |
| **Branch** | <branch> |
| **Intent file(s)** | `intents/INT-00x/intent.md` |
| **Decision record(s)** | `decisions/<file>.md` |
| **External dependencies** | <cross-team / other-system prerequisites from the intent's `## Dependencies`, or "None"> |
| **Architectural grounding** | <regulated/ARB-governed only: the requirement ID / approved-architecture ref from the intent's `## Grounding`, and "conforms" or the deviation flagged for ARB. If this build deviates from an inherited premise, name the `BLD-NNNN` deviation ADR (in `decisions/architecture/`) and its state (`pending-ARB` / `accepted-by-ARB`). "N/A — commercial (no grounding)" otherwise.> |
| **Overall status** | <one line — e.g. "Core intent built, deployed, automated-green; UI walkthrough + 1 gate pending"> |

## 1. Summary

<2–4 sentences: what this PR delivers and why it matters to the engagement.>

## 2. Intent traceability

> The centerpiece. One row per intent guardrail / acceptance criterion. Each maps to the
> component(s) that implement it and the **specific evidence** that proves it. Mark evidence type
> honestly — a criterion is not "done" unless its evidence column says how it was verified.
>
> If the intent has a test script (`intents/INT-00x/test-script.md`, drafted by
> `/ql-test-script`), **reference its criteria here by id** (`INT-00x-Cy`) rather than re-deriving the
> proof story — the test script is the complete-by-construction source; this matrix points at it.
> No script yet? Draft one with `/ql-test-script` so coverage is provable and CI can gate it.
>
> For a **👁 manual** criterion that has actually been run, the Evidence cell cites the execution
> report the run produced — `intents/INT-00x/test-evidence/<date>-<commit>-execution-report.md`
> (written by `/ql-record-test-execution`, pinned to the commit and environment tested) — not just a
> name and a date. A manual criterion not yet run stays 👁 *pending sign-off*; a failed one is ⚠️/⛔
> with its `test-evidence/defect-INT-00x-NN.md` named. Verbal confirmation is not evidence.
>
> For an **`org-probe` ✅** criterion (structural wiring — field type, FLS grant, Flow active —
> verified against the build org), the Evidence cell cites the org-probe record —
> `intents/INT-00x/test-evidence/<date>-<commit>-org-probe.md` (written by `/ql-verify-build`, pinned
> to the commit and target org) — so the reviewer sees the **org** confirmed the wiring, not just that
> the author asserts it. CI can't reach the build org, so this is attested evidence reviewed here, the
> automated twin of the manual execution report (decisions/0031).
>
> A criterion gated on an **external dependency** (see the header row) is honestly ⚠️ partial or
> ⛔ blocked — not ✅ — until that other team / system is ready. Don't mark it green on a handshake
> you don't yet control.

| # | Intent criterion (`INT-00x-Cy`) | Implemented by | Evidence | Status |
|---|---------------------------------|----------------|----------|--------|
| 1 | <criterion + brief ref> | <component(s)> | <test name / query / walkthrough step> | ✅ / 👁 / ⚠️ / ⛔ |

> Before you stamp, `node scripts/intent-ledger.mjs preflight INT-00x` gives a ready-to-deliver readout —
> it runs the same coverage + drift checks CI will, so an unproven ✅ or a drifted stamp is caught here
> instead of after the PR round-trip (advisory — it never gates; CI on the PR is the backstop).
>
> The moment you fill in this matrix for an intent, stamp its delivery — same breath, one command:
> `node scripts/intent-ledger.mjs deliver INT-00x --pr <this-PR>`. It atomically flips the row to
> ✅ Delivered, stamps the current scope hash (no hand-copy), and refreshes the README delivery index
> — then commit `delivery/intent-ledger.md` + `README.md`. (Still building? `start INT-00x` keeps the
> row 🔧 In progress; `deliver` is the close-out.)
>
> **That ✅ is a *claim*, not a self-certification — three things stand between it and "done," none of
> them "the author trusts themselves":** (1) it lands in *this PR's diff*, so it's true on the shared
> branch only when the reviewer **merges** — the merge is the accountable act, and it replaces no 👁
> sign-off; (2) **CI verifies the claim** — `coverage --gate --results` fails the PR if a ✅ criterion's
> named test isn't green, a 👁 is signed `fail`, or an org-probe is recorded refuted, so an unproven ✅
> can't slip through; (3) only a named green test or an org-verified probe earns ✅ — anything a human
> must eyeball is **👁 manual** and stays awaiting sign-off, never auto-passed. Verification is
> machine-first; accountability is the merge. Filling the row *proposes* delivery; CI *proves* it; the
> merge makes it true.

## 3. Components delivered

> Inventory grouped by type. One line of purpose each. This is the "what's in the box" list.

- **Objects & fields:** …
- **Apex (logic):** …
- **Apex (tests):** …
- **Sharing & security:** …
- **Permission sets:** …
- **UI / layouts:** …
- **Mocks / scaffolding:** …
- **Scripts:** …

## 3a. Existing-org consultation (brownfield)

> Brownfield builds land on an org that already has metadata. Before building, the existing
> org / repo metadata was consulted (local `force-app/**` first, live org query when reachable)
> for anything this intent touches. Record what was found and the disposition — so a reviewer
> can see the check happened. `N/A — greenfield / net-new object with no existing analog` is a
> valid answer. `⚠ org not consulted` (no source reachable) must say so, not be left blank.

| What this intent touches | Already present? | In repo, org, or both? | Disposition |
|---|---|---|---|
| <object / field / automation> | <yes / no / ⚠ not consulted> | <repo / org / both / untracked-in-org> | <reused / extended (→ `/ql-refine-intent`) / collision (→ `Q-design-x`) / genuinely-different / net-new> |

## 4. Done manually / outside this diff

> Anything a reviewer CANNOT see in the file diff but that the build depends on: Setup toggles,
> anonymous Apex runs, org-state changes, data loads. Required for reproducibility on a fresh org.

| Action | Where | Reversible? | Notes |
|--------|-------|-------------|-------|
| <e.g. Enable Person Accounts> | Setup → … | ❌ irreversible | … |

## 5. How to verify

**Automated**
```bash
<exact sf commands — deploy + test>
```
- <test group> → proves <criterion>

**Manual (pending sign-off)**
> The runnable manual scenes live in the intent's test script (`intents/INT-00x/test-script.md`)
> — link the scene rather than retyping it; the human records the sign-off there.
> Run them with `/ql-record-test-execution`: it walks the scene step by step and leaves a
> commit-pinned execution report in `intents/INT-00x/test-evidence/` that §2 can cite.
> Already run? List the report(s) below instead of the pending scenes.
1. <persona> → <action> → <expected outcome>  (→ test script scene for `INT-00x-Cy`)

## 6. Decisions & deviations

> Anything that differs from the plan, or a non-obvious choice. Link the decision file.

- **<decision>** — <why>. (`decisions/<file>.md`)

## 7. Deferred / known gaps / follow-ups

- [ ] <item — what, and what unblocks it>

## 8. Deploy notes & gotchas

> Order-of-operations and any metadata-format traps the next engineer would otherwise rediscover.

- …
