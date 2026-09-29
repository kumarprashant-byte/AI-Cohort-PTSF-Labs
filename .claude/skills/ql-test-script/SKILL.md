---
name: ql-test-script
description: >-
  Author a per-intent proof plan from the canonical intent — decompose every guardrail, acceptance clause, and out-of-scope denial path into discrete criteria, each marked how it's proven. Complete-by-construction; feeds the PR §2 matrix and the ledger evidence column. Triggers — "draft a test script", "how do we test this intent", "validation plan", "/ql-test-script".
produces: A co-located `intents/INT-00x/test-script.md` (scope-hash stamped) — the complete-by-construction proof plan of INT-00x-Cy criteria that feeds the PR matrix and the ledger. No commit; plans proof, does not run tests.
---

# Test script — author a per-intent proof plan

A test script here is **not** a `.cls` file. It's the durable proof plan for one intent: a decomposition of everything that must be true for the intent to count as *delivered*, each item marked with **how** it gets proven. It is the missing middle layer between the canonical scope (`intents/INT-NNN/intent.md` — the WHAT) and the retrospective justification (the PR §2 traceability matrix — written after the build). Authored up front from the intent itself, it's **complete by construction**: every guardrail, every acceptance clause, every out-of-scope denial path becomes a row you cannot silently forget. It lives **right beside the intent it proves** — `intents/INT-NNN/test-script.md` — so the WHAT and its proof plan travel together.

Because it's generated from the canonical intent, "we tested everything" stops being a claim and becomes something whose structure is checkable — by a human reading it, and by `node scripts/intent-ledger.mjs coverage`.

The work is mostly reasoning: an intent is prose, and turning its guardrails and acceptance walkthrough into discrete, provable criteria is a judgement call. The helper scripts just load the intent and stamp the scope hash; the decomposition is yours.

## What you produce

One file per intent, **co-located with the intent it proves**: **`intents/INT-NNN/test-script.md`** (beside that intent's `intent.md`). The phase comes from the intent's frontmatter, not the path — so resequencing an intent never moves its test script.

```markdown
---
intent: INT-001
phase: 1
proof_hash: 59b99f9ee762   # node scripts/intent-ledger.mjs hash INT-001 --proof — at authoring
authored: 2026-06-04
---

# INT-001 — Test script

**Intent:** Grant practitioner access to medical history only while assigned to an open application
**Phase:** 1 · **Source intent:** `intents/INT-001/intent.md`

## Criteria

> One row per guardrail / acceptance clause / out-of-scope denial path. Each maps to HOW it's
> proven. `Type`: ✅ automated · 👁 manual · 🔁 awaiting retest · ⚠️ partial · ⛔ blocked · 📋 accepted gap. The ID is the join key —
> the same `INT-001-C1` is referenced by the PR §2 matrix, the ledger, and any Jira/testing-tool export.

| ID | Criterion (source) | How proven | Type | Sign-off |
|----|--------------------|------------|------|----------|
| INT-001-C1 | Assessor denied via SOQL (guardrail 1) | `MedicalHistoryLeakageTest.assessorCannotSeeViaSoql` | ✅ | (CI) |
| INT-001-C2 | Assessor: no MHE tab / related list / report column (guardrail 1) | Manual scene A | 👁 | _pending_ |
| INT-001-C3 | Practitioner reads MHE on Accepted assignment (acceptance) | `MedicalHistoryLeakageTest.practitionerReadsAssignedOpenApp` | ✅ | (CI) |
| INT-001-C4 | Access scoped per-application, not per-patient (guardrail 2) | `MedicalHistoryLeakageTest.practitionerReadsOnlyAssignedApp` | ✅ | (CI) |
| INT-001-C5 | Access revoked the moment assignment ends (guardrail 3) | `MedicalHistoryLeakageTest.shareRevokedOnDecline` + Manual scene B | ✅ | (CI) |
| INT-001-C6 | No bulk export of MHE for any user (out_of_scope) | `MedicalHistoryLeakageTest.noBulkExportPath` | ✅ | (CI) |
| INT-001-C7 | MHE Notes field wired + readable on Practitioner perm set (design) | org-probe (see § Org assertions) | ✅ | (verify) |

## Automated proofs to write

> For each ✅ row whose test does not yet exist, outline it so it's ready to write — never mark a
> criterion ✅ on the strength of a test that isn't green.

- **`MedicalHistoryLeakageTest.assessorCannotSeeViaSoql`** — as an Assessor user, `SELECT … FROM Medical_History_Entry__c` returns 0 rows; assert empty.
- … (one bullet per automated test method, with the assertion it makes)

## Org assertions

> The pre-committed structural facts each `org-probe` ✅ criterion needs true **in the build org**.
> `/ql-verify-build` runs these against the org the build deployed to, before the PR — the org earns
> the ✅. Keyed by criterion id. Authored here, up front from the intent/design, so the check is fixed
> before the build exists (never reverse-engineered to match it). Structural predicates only:
> `object-exists(Obj)` · `field-exists(Obj.Field__c)` · `field-type(Obj.Field__c, Type)` ·
> `field-required(Obj.Field__c)` · `fls(read|edit, Obj.Field__c, permset=Name)` · `permset-exists(Name)` ·
> `record-type-exists(Obj.RT)` · `flow-active(FlowApiName)` · `validation-rule-exists(Obj.Rule)`.
> Name the predicate you need; `/ql-verify-build` resolves it to the org query at runtime (DX MCP or `sf` floor).

- **INT-001-C7** (MHE Notes field wired + readable on the Practitioner perm set):
  - `field-exists(Medical_History_Entry__c.Notes__c)`
  - `field-type(Medical_History_Entry__c.Notes__c, LongTextArea)`
  - `fls(read, Medical_History_Entry__c.Notes__c, permset=Practitioner_Access)`

## Manual validation scenes

> The runnable human script for 👁 rows. Persona → action → expected outcome, demo-script quality.
> A human performs these and records the result in the Sign-off column (and ultimately the ledger).

### Scene A — Assessor denied across every UI path (criteria C2)
1. Log in as the Assessor persona.
2. Open the app — confirm **no Medical History Entries tab** in the nav.
3. Open any Subsidy Application — confirm **no MHE related list, no MHE field** on the page.
4. Navigate to `/lightning/o/Medical_History_Entry__c/list` — list loads, **0 records**.
**Expected:** medical history is invisible on every path. **Sign-off:** _name / date / pass·fail_.

### Scene B — Access cut immediately on decline (criterion C5, human-visible half)
1. …
```

## Step 1 — Resolve the intent

Take the intent id from the user (e.g. `INT-001`). Load it and confirm it exists:

```bash
node scripts/intent-ledger.mjs hash INT-001 --proof   # prints "INT-001  <proof hash>  <title>"
```

Then read the full intent from `intents/INT-NNN/intent.md` (the living canonical Intent). You need its `phase`, `title`, `guardrails`, `acceptance`, `out_of_scope`, `dependencies`, and `open_questions`. If the id doesn't match any intent, stop and say so — point the user at `node scripts/intent-ledger.mjs hash` to list them. If no id is given, list the intents and ask which one.

If a **`intents/INT-NNN/design.md`** exists (authored by `/ql-design-intent`), read it too — it tells you the concrete objects, automation, and UI surfaces the build will touch, so your criteria can name the right tests and manual scenes (which Apex class, which page/layout to check) instead of inferring them from the intent prose. The intent is still the canonical source of *what must be true*; the design just sharpens *how each criterion is proven*.

## Step 2 — Decompose into criteria

This is the heart of the skill. Walk the canonical fields and turn each into one or more discrete, provable criteria — **completeness is the point**, so don't merge two distinct obligations into one row:

- **Every `guardrail`** → at least one criterion. A guardrail that names several paths ("not via record page, list view, report, export, or SOQL") usually splits into an automated row (SOQL/export — assertable) and a manual row (UI surfaces — observed). Split them; they're proven differently.
- **Every clause of `acceptance`** → the positive-path criteria (the walkthrough of what *should* work). A concrete prose walkthrough decomposes cleanly — each observable outcome (a named actor doing a thing, a specific result) becomes one criterion; and where acceptance is written as **Given/When/Then** scenarios, each scenario maps one-to-one the same way. Either form decomposes; what you're extracting is the observable outcome, not the syntax.
- **Every `SC-x` in `## Success criteria`** (if present) → a criterion proving that measurable outcome. These are the intent's own statement of *what must be objectively true*, so they're often the sharpest, most directly-provable criteria — turn each `SC-x` into its `INT-00x-Cy` with the test or measurement that confirms it.
- **Every `out_of_scope` item that is a denial** → a criterion proving the thing genuinely can't happen. (Out-of-scope items that are *deferrals of future work* — "real integration is production-phase" — are **not** test criteria; note them in a short "Deliberately not tested (out of scope)" list instead, so the reader sees you considered them.)

Give each criterion a stable id `INT-NNN-Cx` (sequential). **This id is the join key** — the PR §2 matrix, the ledger evidence, and any future Jira sub-task / test case reference the same `INT-NNN-Cx`. Don't renumber existing ids on a later edit; append new ones.

If an `open_question` (`Q-xxx`) gates how a criterion should behave, don't guess the behavior — write the criterion as `⛔ blocked` and name the question. (Check `decisions/` first; an answer may already exist — `grep -rn "Q-001" decisions/`.)

**External dependencies cap how high a criterion can be proven.** If the intent's `## Dependencies` declares an `external` (cross-team / other-system) dependency, any criterion that can only be fully proven once that other team or system is ready is **not** ✅ — it's ⚠️ partial (the Salesforce half is built and asserted, the end-to-end isn't) or ⛔ blocked (nothing provable until they deliver). Name the dependency in the criterion. Honest proof means not marking a criterion green on a handshake you don't yet control. (Internal dependencies are different — they're other intents in this repo; sequence around them, but they don't cap proof the way an external team does.)

## Step 3 — Classify each criterion: how is it proven?

For each criterion pick the honest marker (same legend as the PR template):

- **✅ automated** — an Apex test method or a query/SOQL assertion can prove it deterministically. When an Apex test carries the proof, **write its `Class.method` in backticks** (e.g. `` `MedicalHistoryLeakageTest.assessorCannotSeeViaSoql` ``) — this isn't decoration: `coverage --results` reads the backtick-fenced `Class.method` out of the "How proven" cell and confirms it ran **green** in CI, so a ✅ becomes a CI-confirmed proof, not just your say-so. The backticks matter — only a fenced `Class.method` is treated as a test ref, so an unfenced field/API name (e.g. Account.Industry) is never mistaken for one. A **red** test fails the gate (for any intent); a named test whose class ran but the **method doesn't exist** fails an exhaustive run (a typo or deleted test). A ✅ proven by a **SOQL/config assertion** (no Apex method to name) is fine — it just can't be CI-auto-confirmed, so it reads as "unconfirmed" and leans on the human/PR review, never a false gate failure. If the test doesn't exist yet, still mark ✅ **only if you will write it as part of this intent's build** — and outline it under "Automated proofs to write" so it's ready, not imaginary. A ✅ whose Apex test never goes green won't survive the gate; downgrade a truly unbacked one to ⚠️.
- **✅ via org-probe (structural)** — a structural/wiring fact a query can settle: a field exists and is the right *type*, a permission set actually *grants* FLS, a Flow deployed *active*, a record type or validation rule exists. Author it as a named predicate in **`## Org assertions`** (keyed by criterion id) and put an `org-probe` token — not a backticked `Class.method` — in the How-proven cell. `/ql-verify-build` executes these against the build org **before the PR**: the org earns the ✅ (org refutes → you can't publish the ✅; org unreachable → `⚠ org not verified`, never a block), and it writes commit-pinned evidence reviewed at PR. Use this for *is the metadata wired correctly* — the gap a behavioral Apex test can't reach (a test can pass while the field is the wrong type or ungranted). Authoring the predicate **here, up front, from the intent/design** — before the build exists — is what keeps it from being reverse-engineered to match whatever got built. Structural only: behavioral acceptance stays an Apex-test ✅; experiential stays 👁. (decisions/0031)
- **👁 manual** — only a human can observe it: UI visibility (tabs, related lists, page layout), report-column availability, a persona's lived experience, Setup state, look-and-feel. Write the runnable scene under "Manual validation scenes" and leave the Sign-off cell `_pending_`. **You never fill a 👁 sign-off yourself** — the human validates and signs (see AGENTS.md ethos).
- **⚠️ partial** — the mechanism is provable but the end-to-end isn't yet (e.g. the share row is asserted, but the full UI consequence isn't). Say what's covered and what's missing.
- **⛔ blocked** — can't be verified until a gate clears (an unanswered `Q-xxx`, a missing org feature, a dependency on a later intent). Name the blocker.
- **🔁 awaiting retest** — a defect was found and a fix has landed, but nobody has re-verified it yet. Transient: it gates like ⚠️/⛔ until a passing retest flips it back to ✅/👁. `/ql-record-test-execution` sets it on a fix, clears it on a passing retest. Don't hand-mark a criterion ✅ off an unverified fix — that's what 🔁 is for.
- **📋 accepted gap** — a criterion we've **consciously decided to close without proving**: a deferred defect, an accepted MVP limitation, something the platform can't do. This is the honest home for "we're shipping without proving this," so it's the *only* non-✅/👁 marker that doesn't gate — **but only when it carries a named accepter and a pointer.** Write the cell as `📋 accepted by <name> — <pointer>`, where `<pointer>` is a follow-on intent (`INT-NNN`), a decision record (`decisions/…`), a URL, or the word `waiver`. A bare `📋` with no accepter+pointer is treated as **unproven** and gates like ⚠️ — the guard against 📋 becoming a quiet way to mark unproven work done. The accepter is the human who owns the call (you don't self-accept a gap on the customer's behalf); record the *why* in the pointer. Never route an accepted gap to a follow-on intent nobody intends to build just to make it disappear — that's what 📋 prevents.

Prefer ✅ where a test can genuinely carry the proof — automated criteria self-prove on every deploy and need no human time. Reserve 👁 for what automation truly can't reach. Don't inflate coverage by marking observable-only things ✅, and don't dump provable things into 👁 to avoid writing a test.

## Step 4 — Draft the file

Write `intents/INT-NNN/test-script.md` (the intent's directory already exists — it's where `intent.md` lives). Stamp the **current** scope hash into the frontmatter:

```bash
node scripts/intent-ledger.mjs hash INT-NNN --proof    # copy the 12-char hash into proof_hash:
```

That stamp is what makes drift detection free: the proof hash covers the scope fields (`title + build_target + guardrails + out_of_scope + acceptance`) **plus the success criteria**, since every `SC-x` drives a proof criterion — so if any of them changes, `coverage` flips this script to 🔄 *re-verify* (the ledger stays put: its scope hash excludes SC-x on purpose; `decisions/0061`). A test script that proves an old version of the intent is worse than none; the stamp catches it. An older script stamped `scope_hash:` still passes but can't see an SC edit — replace it with `proof_hash:` whenever you touch the script. Set `authored:` to today's date.

Fill the table, the "Automated proofs to write" outlines, and the "Manual validation scenes". Keep the manual scenes runnable cold: a person who wasn't in the build should be able to follow them step by step.

## Step 5 — Reconcile with the rest of the trust chain

Tell the user how this plugs in (and offer to do the mechanical parts):

- **Coverage check** — `node scripts/intent-ledger.mjs coverage INT-NNN` reports this intent's status (current/complete, drifted, incomplete, manual-pending). Run it now to confirm the file parses. In CI, the same command is fed the test-run output (`coverage --gate --results apex-test-results.json --tests-complete`) so each ✅ criterion's named `Class.method` is confirmed green — which is why naming the test precisely in the table matters.
- **Org-probe check** — before the PR, `/ql-verify-build` runs the `## Org assertions` against the build org, writes a commit-pinned evidence file, and earns (or downgrades) each `org-probe` ✅. It's the automated, attested complement to `/ql-record-test-execution`'s manual 👁 sign-off — CI can't reach the build org, so this runs at build time and is reviewed at PR (decisions/0031). Only relevant if this script has `org-probe` criteria.
- **PR §2 matrix** — when the build lands, the PR's traceability matrix *references* these criteria by id rather than rebuilding them: each row's "Evidence" cites the `INT-NNN-Cx` proof. Offer to pre-fill the matrix from the script.
- **Ledger evidence** — the one-paragraph evidence summary in `delivery/intent-ledger.md` summarizes the script (e.g. "INT-001-C1..C6 — 4 ✅ green, C2/C5 manual signed").
- **Demo script (optional)** — offer to roll this intent's 👁 scenes into `delivery/phase-N/demo-script.md` as a curated cut for the daily demo / stakeholder walkthrough. The per-intent script stays the source of truth; the demo script is a derived presentation cut.

## Step 6 — Sign-off write-back conventions

The test-script file is both the proof plan and the results record — but **this skill authors the plan and each criterion's initial Sign-off cell; it doesn't run tests or fill in results** (see "What this does NOT do"). Results are written back by whoever proves each criterion: CI's `coverage --results` for Apex ✅, `/ql-verify-build` for `org-probe` ✅, `/ql-record-test-execution` for 👁 manual. These are the Sign-off cell conventions each writes against — stated here as the single source they cite:

- **`✅` criteria with a named `` `Class.method` ``:** the cell reads `(CI)` until CI runs, then `(CI — green, {date})` on a green run or `❌ FAILED — {failure message}` on failure. CI's `coverage --results` step confirms these automatically; the write-back makes the result human-readable in the file.
- **`✅` criteria proven by an `org-probe` assertion (no named test method):** `(verify — green, {date})` once the org confirms every predicate — or `❌ org refutes — {detail}` / `⚠ org not verified`. `/ql-verify-build` writes these.
- **`👁` manual criteria:** leave `_pending_` (see the 👁 marker rule above — you never sign). When the human runs the scene, `/ql-record-test-execution` fills the cell as `{name} / {date} / pass / {report-filename}` — slash-separated (an em-dash or the word "pending" in that cell makes `coverage` read a signed criterion as unsigned).
- **`⚠️` partial criteria:** the cell records what ran and what remains open.
- **On a failure:** the criterion gets a defect evidence record linked to its `INT-NNN-Cx` id (failure type, the SC-x/acceptance clause violated, reproduction steps); diagnosing and fixing it is `/ql-diagnose`'s lane, and `/ql-record-test-execution` drafts the defect on a manual-QA fail.
- **"Done" is never set here.** The agent authors and records against the plan; a human signs the 👁 criteria, and the ledger's ✅ Delivered is `intent-ledger.mjs deliver`'s call — never a side effect of writing a result cell.

## What this does NOT do

- It does **not** run tests or deploy anything — it plans proof; it doesn't execute it.
- It does **not** write `.cls` test files. It *outlines* automated tests (names + assertions) so they're ready to write; writing and running them is the build.
- It does **not** sign off manual criteria. A 👁 sign-off is a human validation act — the agent drafts the scene and leaves the Sign-off cell `_pending_`; the human's signature is the human's (AGENTS.md ethos).
- It does **not** edit the intent itself (`intents/INT-NNN/intent.md`) — refining scope is `/ql-refine-intent`'s job; this skill only *reads* the intent to plan its proof. And it does **not** push to Jira. The stable `INT-NNN-Cx` ids are the join key `/ql-sync-jira` projects from — projecting is its job, not this skill's.
