---
name: ql-verify-build
description: >-
  Verify the build org satisfies an intent's structural criteria — run each `org-probe` criterion's assertions against the org the build deployed to, so the org earns the ✅ instead of the agent asserting it. The automated twin of /ql-record-test-execution — for a manual QA walkthrough ("run the tests", "run the test script"), use that skill, not this one. Triggers — "verify the build", "run the org-probe for INT-", "did the build wire up correctly", "/ql-verify-build".
produces: >-
  A new `intents/INT-00x/test-evidence/{date}-{commit}-org-probe.md` per run (historical — never overwritten), recorded via `node scripts/intent-ledger.mjs verify`. Updates the Sign-off cell of the `org-probe` ✅ criteria just run in `intents/INT-00x/test-script.md` — `(verify — green, {date})` on confirm, `❌ org refutes — {detail}` on refute, `⚠ org not verified` when unreachable. Surfaces an org-probe line for the PR §2. Never deploys, never edits the intent, never writes the ledger row (that stays `intent-ledger.mjs start`/`deliver`).
---

# Verify build — the org earns the ✅ before the PR

`/ql-test-script` authored, up front, the structural facts each `org-probe` ✅ criterion needs true in the org (its `## Org assertions`). This skill **runs them against the build org** — the org the agent (or a MeshMesh build) just deployed to — so a ✅ means *the org confirmed it*, not *the agent asserted it*. It's the "expected comes from the intent, actual comes from the org, the builder is what may have lied" discipline (decisions/0031), and it's the automated complement to `/ql-record-test-execution`: that skill walks a human through the 👁 manual half; this one machine-verifies the structural half.

**Where it sits — an early, repeated loop, not just a final gate.** Each `org-probe` criterion *refutes until the wiring is right* and *confirms once it is* — so running it as you build each piece is a **red→green loop** that tells you the moment the org matches the intent, instead of a surprise at PR time. Probe early and often; run it a last time **before the PR opens**. CI runs `coverage --gate` later but CI has **no build org** — it can never check org state. So this runs at build time, against the reachable build org, and its result is **attested, commit-pinned evidence reviewed by the human at PR** — the same trust basis as manual test evidence, not a CI re-run.

**What it does NOT touch.** Apex-test ✅ criteria (CI proves those — a backticked `Class.method` in the test-script) and 👁 manual criteria (`/ql-record-test-execution`'s job). It operates only on `org-probe` ✅ criteria — the ones whose How-proven cell carries the `org-probe` token and whose predicates live in `## Org assertions`.

**Build-engine-agnostic.** It reads the **org**, never the retrieved/built metadata (that would just re-trust the artifact) — so it verifies an `sf`-CLI build and a `/ql-drive-meshmesh` build identically. The org is the seam (decisions/0030).

## Step 1 — Resolve the intent and load its org assertions

Take the id (e.g. `INT-042`). Load `intents/INT-00x/test-script.md`. If it doesn't exist, stop and point at `/ql-test-script` — this skill executes an existing proof plan, it doesn't invent one.

Read the **`## Org assertions`** block. If the script has no `org-probe` criteria (no such block, or an empty one), say so and stop — this intent has no structural org footprint to verify (a doc, a config-only change), and that's a clean no-op, not a failure.

Confirm the test script isn't stale against the intent:

```bash
node scripts/intent-ledger.mjs coverage INT-00x   # flags a drifted test-script stamp
```

If it reports 🔄 drifted, the assertions may prove an old version of the intent — surface that and let the human decide whether to re-author the script first.

## Step 2 — Resolve the build org

The org to probe is **the one the build deployed to** — the dev/build sandbox, or the org a `/ql-drive-meshmesh` build targeted. Confirm which org is the target and that it's reachable (prefer the loaded DX MCP `orgs`/`metadata`/`data` tools; `sf org display --target-org <alias>` is the floor). State the alias/username you resolved so the evidence records which org it checked.

**If no build org is reachable**, do not guess and do not block: mark the org-probe criteria `⚠ org not verified` (Step 5), record that in the evidence, and say the verification must run once an org is reachable. Honest degradation, never a false ✅ and never a hard stop (decisions/0031, mirroring 0005's `⚠ org not consulted`).

## Step 3 — Run each assertion against the org

For each `org-probe` criterion, resolve every predicate in its `## Org assertions` block to an org query and run it. **Questions-first, tool-agnostic** (decisions/0005): name *what to confirm*; resolve *how* at runtime (DX MCP first, `sf` CLI floor). The predicate vocabulary and what confirms each:

- `object-exists(Obj)` / `field-exists(Obj.Field__c)` — `sf sobject describe --sobject Obj --json` (read `.fields[].name`), or a Tooling `EntityDefinition` / `FieldDefinition` query.
- `field-type(Obj.Field__c, Type)` — **resolve the design vocabulary before comparing.** `describe` reports `.type` as API values (`textarea`, `currency`, `boolean`, `double`, `reference`), so a design token like `LongTextArea`/`Currency`/`Checkbox` will **never** `===` the describe `.type` — comparing them literally false-refutes a correct field. Match case-insensitively against the known alias for the design type, or read the friendlier `DataType` via Tooling `SELECT DataType FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName='Obj' AND QualifiedApiName='Field__c'`. (For a Long Text Area specifically: describe `.type` is `textarea` with `length > 255`.)
- `field-required(Obj.Field__c)` — `.nillable === false` (and not defaulted) on the describe.
- `fls(read|edit, Obj.Field__c, permset=Name)` — the permission set actually grants it: Tooling `SELECT PermissionsRead, PermissionsEdit FROM FieldPermissions WHERE Parent.Name = 'Name' AND Field = 'Obj.Field__c'`. This is the one an Apex test most often passes without.
- `permset-exists(Name)` — `SELECT Id FROM PermissionSet WHERE Name = 'Name'`.
- `record-type-exists(Obj.RT)` — Tooling `SELECT Id FROM RecordType WHERE SobjectType='Obj' AND DeveloperName='RT'` returns a row.
- `flow-active(FlowApiName)` — Tooling `SELECT ActiveVersionId FROM FlowDefinitionView WHERE ApiName='FlowApiName'` is non-null (deployed *and* active — a Flow can deploy inactive).
- `validation-rule-exists(Obj.Rule)` — Tooling `SELECT Id FROM ValidationRule WHERE EntityDefinition.QualifiedApiName='Obj' AND ValidationName='Rule'` returns a row (presence only; if enablement matters, add a dedicated active-state predicate — extend the vocabulary rather than overloading this one).

A predicate you can't resolve to a query (an unknown or ill-formed one) is **not** a pass — record it `⚠ unresolved` and surface it; never treat "I couldn't check it" as confirmed.

## Step 4 — Record the evidence (the script owns the pass/fail record)

Assemble the per-criterion, per-predicate results and hand them to the recorder — the deterministic script owns the durable record, so the result is machine-readable and commit-pinned, not agent prose:

```bash
node scripts/intent-ledger.mjs verify INT-00x --results <probe-results.json>
```

`probe-results.json` is the object `{ target_org, criteria: [...] }` the skill writes — **always include `target_org`** (the alias/username you resolved in Step 2) so the evidence attests *which* org was queried; a bare array omits it and the record can't say which sandbox. Each `criteria` entry is one org-probe criterion with its `predicates`, each predicate carrying its `pass`/`refute`/`unresolved` verdict and the observed value. `verify` **derives the criterion verdict from its predicates** — a refuting predicate cannot be recorded as a confirmed criterion, so an honest per-predicate result is what matters. It writes a new, never-overwritten `intents/INT-00x/test-evidence/{YYYY-MM-DD}-{commit-short}-org-probe.md` (frontmatter: intent, verified_by, verified_at, target_org, branch, commit — the commit gets a `-dirty` suffix if the worktree has uncommitted changes, so the pin stays honest; body: a per-criterion predicate → expected → org-actual → verdict table), prints the summary, and exits 0 — **advisory by construction, never a gate** (mirrors `preflight`; CI's `coverage --gate` remains the backstop, decisions/0023).

If the recorder isn't available in this checkout, write the same evidence file by hand in that format — the record is what matters, not the transport.

## Step 5 — Update the marks (the org earns the ✅)

For each `org-probe` criterion, write **only its Sign-off cell** in `test-script.md` (never edit the criterion wording or the `Type` glyph — same discipline as `/ql-record-test-execution`):

- **Org confirms every predicate** → `(verify — green, {date})`. The ✅ is earned.
- **Org refutes any predicate** → `❌ org refutes — {which predicate, observed value}`. You **cannot publish this ✅**: fix the build and re-run, or if it's genuinely not achievable, downgrade the criterion honestly (⚠️/⛔) via `/ql-test-script` — the criteria are its artifact (`/ql-refine-intent` edits the intent, not the test script). If the org is wrong rather than the criterion, `/ql-diagnose` owns the fix. Never leave a refuted criterion reading ✅.
- **Org unreachable / predicate unresolved** → `⚠ org not verified` (or `⚠ unresolved: {predicate}`). Surfaced, not swallowed.

Every run appends a **new** evidence file, so re-running after a fix is safe and historical — the same posture as `/ql-record-test-execution`.

## Step 6 — Surface for the PR

Report the outcome plainly and give the human the PR line for §2 (the org-probe row of the traceability matrix, alongside the Apex-test and manual evidence): e.g. `Org-probe (INT-042): 5/5 structural assertions verified against {org} at {commit} — evidence: {file}`, or the refutes/unverified if any. This is what makes the machine verification visible at review — the human ratifies delivery seeing that the org confirmed the wiring, not just that the agent said so.

## What this does NOT do

- It does **not** deploy or change the org — it only reads (queries) it. The build put the metadata there; this checks it landed right.
- It touches **only** `org-probe` ✅ criteria — see *What it does NOT touch* above (Apex-test ✅ is CI's job, 👁 manual is `/ql-record-test-execution`'s).
- It does **not** author assertions — those are `/ql-test-script`'s, written up front from the intent so they can't be reverse-engineered to the build. This skill only *runs* them.
- It does **not** edit the intent or write the ledger row (`start`/`deliver` own that), and it **never gates** itself. The `❌ org refutes` it records in the Sign-off cell is what `coverage --gate` reads: a refuted org-probe ✅ fails the gate on a Delivered intent and holds `preflight`. An unverified one (`⚠ org not verified`) is only noted.
