<!--
  Engagement PR review guidance — read by any agent asked to review a build PR.
  This is the *reviewer* side of the PR. The PR template (.github/pull_request_template.md)
  is what the *author* fills in; this is how a reviewer checks that it's honest and complete,
  and passes over the actual diff for bugs, security, and standard-first fit.

  Harness-neutral: any agent (Claude Code, Cursor, Codex, opencode, …) reads this file.
  Engagement-editable: the passes, the Important/Nit line, the nit cap, and the
  do-not-report list below are defaults — tune them to this engagement. `/ql-resync`
  treats this whole file as edit-in-place — it never clobbers your tuning; when the
  plugin's copy improves, it surfaces the diff for you to merge by hand.

  What this is NOT: an approval. A reviewer produces findings; it never approves, merges,
  or stamps delivery. The merge is the human's accountability act (AGENTS.md → "The human
  validates"). Findings inform the human; they do not gate on their own.
-->

# REVIEW.md — how we review a build PR

A build PR in this engagement doubles as a testing + handoff artifact. Reviewing it is two jobs at once: **is the artifact honest** (does §2 tell the truth about what's proven?) and **is the code right** (bugs, security, standard-first). Run the passes below in order — the first is the one nothing else does.

Scope the review to the change: `git diff --name-only <base>..HEAD` plus untracked files. Report findings grouped by pass, each marked **Important** or **Nit** (defined below). Lead with the decision — the overall read first, then the findings (AGENTS.md → *signal before detail*).

## Pass 1 — Intent honesty (the centerpiece)

The author's §2 traceability matrix *claims* each criterion is proven. This pass checks the claim. This is the pass that protects the trust chain, so it comes first and it's the one a human should never have to do by eye.

- **Coverage.** Every criterion in the intent's `test-script.md` (`INT-00x-Cy`) appears as a §2 row. A criterion silently missing from the matrix is the failure this pass exists to catch — flag it **Important**.
- **No ✅ without cited evidence.** A ✅ row must cite a *specific* proof: a named green test/query (automated), an `org-probe` record (`/ql-verify-build`), or — for 👁 — an execution report under `test-evidence/`. "Tested manually", a bare date, or a verbal handshake is **not** evidence → **Important**.
- **Honest markers.** A criterion gated on an external dependency is ⚠️/⛔, not ✅. A 📋 accepted gap has a named accepter + a pointer (a bare 📋 gates). A 🔁 awaiting-retest hasn't been re-run. Anything marked done that the diff/evidence doesn't support → **Important**.
- **Drift respected.** If the intent's scope hash moved after delivery (ledger shows 🔄), the PR should address it, not paper over it.
- **Cascading consequences disclosed.** A new field/object that needs FLS, an app slot, a page/layout/list view to be *usable* — either done in the diff or flagged in §7 (deferred/gaps). A half-wired increment marked done → **Important** (AGENTS.md → *Cascading consequences*).
- **Scope discipline.** Nothing in the diff builds beyond the intent's build target, or acts on PR feedback that `/ql-check-scope` would route to a future intent. Silent scope absorption → **Important**.

If §2 is honest and complete, say so plainly — that's the pass passing.

## The mechanical floor — Code Analyzer / PMD runs first

Before you review by eye, the deterministic layer has already run: CI runs **Salesforce Code Analyzer** (PMD and friends; config in `code-analyzer.yml`) on every `force-app/**` PR and fails on Critical/High. That already covers the *mechanical* rules — SOQL/DML in loops, CRUD/FLS violations, SOQL injection, hardcoded ids, empty catch blocks. **Don't re-report those by eye** (see *Do not report*): if the analyzer is red, that's the finding, and the fix is to make it green, not to restate it. Passes 2 and 3 are for what the analyzer *can't* judge — whether the code is semantically right, and whether a security *choice* is the correct one for this data. Apply the same materiality bar throughout: report a finding only when it ties to a concrete failure; a clean diff produces an empty list, and that's the correct result, not a reason to keep hunting.

## Pass 2 — Correctness (what the analyzer can't judge)

The analyzer proves the code is *shaped* safely; this pass proves it's *right*.

- **Logic vs. acceptance.** Trace the changed path against each `INT-00x-Cy` — does it actually produce the intent's acceptance walkthrough? A logic bug here passes PMD and fails the user.
- **Denial paths.** The guardrails / out-of-scope name things that must *not* happen (an actor who can't see a record, an export that can't run). Confirm the diff genuinely blocks them — the negative path is where correctness quietly fails.
- **Bulk semantics, not just bulk shape.** PMD flags SOQL-in-a-loop; it can't tell you a trigger silently drops records past the first, or a map keyed wrong collides in bulk. Check the logic holds at 200 records, not just that the query moved out of the loop.
- **Branch & boundary handling.** Null/empty collections, off-by-one, wrong operator, and the *un-handled members of a fixed set* — you special-cased two of three statuses; what happens to the third? Mechanical enumeration over the changed lines, not intuition.
- **Automation order-of-execution.** A new trigger / Flow / record-triggered automation on an object that already has automation — does it fire in the right order, re-enter, or fight an existing rule? PMD can't see the interaction.
- **Test quality.** Does the test assert real behavior and the intent's denial paths, or just run for coverage? (PMD checks a test *exists*; only you can tell it *proves* something.)

## Pass 3 — Security (the choices, not the mechanics)

The analyzer flags *missing* enforcement; this pass judges whether the *choice* is right for this data. Weight by blast radius — a sharing decision on regulated data outranks a cosmetic one.

- **Is `without sharing` / `SYSTEM_MODE` justified here?** PMD flags an un-declared sharing mode; it can't tell you that this choice on *this* object exposes records a user shouldn't see. On user-facing data it needs a stated, recorded reason — otherwise **Important**.
- **The right grant, not just a grant.** A new field's FLS or a permission-set change should trace to *the* permission-set model the intent owns — not a broader profile or a convenient existing set. Over-broad access that happens to work is still wrong.
- **The invisible-field trap.** A new custom field with no FLS granted deploys clean and is visible to no one — a half-wired increment that fails the *usable* bar (`check-fls.mjs` guards this; confirm it's addressed).
- **Guest / Experience Cloud exposure.** Data reachable by the site Guest User or an unauthenticated context that shouldn't be — the highest-blast-radius miss on a community build.
- **Secrets & portability judgment.** PMD catches unbound SOQL and obvious secrets; you catch the credential tucked in a Custom Metadata record, the org-specific id that won't port to another org, the "temporary" hardcoded id.

## Pass 4 — Standard-first & architecture fit

- **Standard before custom.** Apex where a Flow/validation-rule/standard capability fits, a custom object where a standard one works — flag it, and check the design's *Alternatives considered* said why the standard path was rejected.
- **Matches `design.md`.** If the intent has a ratified design, the build conforms to it — the relationship type, the sharing model, the automation choice. A silent departure from the ratified approach → **Important** (a declared one cites its decision record).
- **Admin-ownable.** The bar is an implementation the customer's own admin can own after handoff — no cleverness that only the author understands.
- **Conformance (regulated engagements).** If the intent is grounded, the build doesn't silently deviate from the approved architecture or an inherited premise (a deviation must be a declared `BLD-NNNN` ADR, not a surprise in the diff).

## Your engagement's ratified conventions (tune this section)

The passes above are the universal Salesforce bar. Most engagements also ratify their *own* conventions, and a reviewer should enforce those too. Add yours here — examples from real engagements, delete or replace with what *this* one adopted:

- **Data access** — all DML/SOQL through a repository/service layer (no inline `[SELECT]` / `Database.query` in a controller, trigger, or service); queries run in `USER_MODE`.
- **Triggers** — logic in a trigger-actions framework bound via custom metadata, not in the trigger body.
- **Tests** — the ratified test-layer split (DML-less unit vs. end-to-end wiring) and the persona/`runAs` convention (personas from a service, never a hand-rolled `User`).
- **Error logging** — the ratified logger standard: every real `catch` persists the error (not a silent swallow, not a bare `System.debug`); Flow fault paths log the same way.
- **Naming** — the metadata API-name convention (e.g. name by function, no type prefix).

Flag a finding here as **Important** only when it breaks a convention this engagement *actually ratified* — named in `AGENTS.md` or a `decisions/` record. A "best practice" nobody here adopted is not a defect (at most a Nit, subject to the cap).

## Important vs. Nit

- **Important** — a correctness/security/scope defect, a false ✅, a missing criterion, a silent design or scope departure. Anything that makes the PR *wrong* or the artifact *dishonest*. Report all of these.
- **Nit** — style, naming, a cleaner phrasing, a preference with no behavioral consequence. Useful but never blocking.

**Nit cap: report at most the 5 highest-value nits.** Past that, a pile of nits drowns the Important findings — the failure mode this cap exists to prevent. If you're tempted to exceed it, that's a signal the Important findings are what matter here.

## Do not report

- Anything a formatter/linter or CI already enforces (indentation, import order) — CI is the deterministic layer; don't duplicate it by eye.
- A deliberate, already-recorded trade-off — cite the `decisions/` record instead of re-flagging it.
- Future-phase scope the intent explicitly defers, or an item already in §7 — that's disclosed, not a defect.
- Preferences dressed as defects. If it isn't wrong, it's a Nit (and subject to the cap).

## What this review does not do

- It does **not** approve, merge, or stamp delivery. Findings inform the human; the **merge is the human's accountable act** — the accountability that stays a person's (AGENTS.md → *Accountability*).
- It does **not** gate. CI (`validate` / `drift` / `coverage --gate`) is the deterministic gate; this review is judgment layered on top of it, not a replacement.
- It does **not** edit scope. If review reveals the *intent* is wrong, route to `/ql-refine-intent` — don't fix it in the build PR.
- The agent that wrote the code does not review-and-approve its own PR. Separation of duties holds: the review is a distinct pass, the human merges.
