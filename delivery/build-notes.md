# Build notes — recurring Salesforce build gotchas

Forward-looking traps that *recur* across Salesforce delivery work — the "expect this again" list.
Per-increment specifics belong in each `delivery/phase-N/README.md` "Gotchas" list (backward-looking
record); this file is for gotchas general enough to bite the next intent. Skim it before building a
new automation/lifecycle intent, and append engagement-specific ones as you hit them.

## Deploy / metadata

- **CustomMetadata record placeholder values must fit the field's defined length.** Long English-language placeholder strings (e.g. "PLACEHOLDER — populate with the assessor profile name after Q-001 is resolved") can exceed a `Text(80)` field at deploy time even though the intent is to leave the field blank. Symptom: `<FieldLabel>: data value too large: PLACEHOLDER... (max length=80)`. Fix: on an *optional* field, use `xsi:nil="true"` in the `<value>` element (the `xsi` namespace is already bound on the record's root `<CustomMetadata>` element, since populated values carry `xsi:type`) — the record deploys as an empty shell and the deploy-runbook documents population later. A *required* field can't be left null, so fit a real placeholder inside its length limit instead.
- **CustomMetadata *records* may fail to source-deploy** even when the `__mdt` *type* deploys fine.
  Symptom: a `customMetadata/*.md-meta.xml` record errors with a server `UNKNOWN_EXCEPTION` /
  `numberComponentsTotal: 0` via `sf project deploy` and the MCP deploy tool, while the object +
  fields deploy cleanly. Because CI uses the same deploy path, committing the record file can break
  the pipeline. Pattern: ship the type, give consuming Apex a hardcoded fallback when
  `getInstance('<record>')` is null, and create the record manually in Setup (or via Tooling API).
- **`rollbackOnError` is whole-transaction.** A multi-component deploy that fails on any one
  component rolls back *all* of them — an Apex class can silently un-deploy because a Flow in the
  same request failed. Deploy a fixed component on its own, or re-include everything, and re-verify
  what actually persisted rather than trusting a partial earlier success.
- **Reach for the right Salesforce tool — don't improvise with anon Apex.** Each job has a
  purpose-built path in the `sf` CLI; the recurring failure is improvising with the one tool reached
  for by reflex (anonymous Apex). Anon Apex also has a hard source-length limit, so loading records or
  config as one big `insert` script (e.g. AssessmentQuestion) can exceed it and fail to run at all —
  and it's the wrong tool regardless. Match the job to its command:
    - **Metadata** (objects, fields, Flows, Apex, perm sets, layouts) → `sf project deploy start`.
    - **Data / records** (setup records, seed data) → `sf data import tree` for bulk, or
      `sf data create record` for a few; Data Loader for volume — not an Apex `insert` script.
    - **Permission-set assignment** → `sf org assign permset --name <ps> --on-behalf-of <user>` —
      not an Apex `PermissionSetAssignment` insert.
    - **One-off operational step** (`System.schedule` for a CronTrigger, a backfill `sf data`
      can't express) → `sf apex run --file <script>.apex`. This is the *only* place anon Apex belongs,
      and it still can't exceed the source-length limit.
  Before scripting a workaround, check whether an `sf` command or a metadata type already does the job.

## Roles / RecordTypes (UserRole and RecordType metadata)

- **Role access levels use `Edit`, not `ReadWrite`.** The valid enum values for `caseAccessLevel`, `contactAccessLevel`, and `opportunityAccessLevel` on UserRole are `None`, `Read`, `Edit` — not `ReadWrite`. Using `ReadWrite` produces an "unexpected error" (no schema error message) that looks like a transient server issue but is consistent. The retrieved org XML uses `Edit`; that's the canonical form. Access levels must also be >= the org OWD for that object (a fresh org defaults Opportunity OWD to Public Read/Write, so `None` fails with "access level below organization default").
- **Role XML requires `<name>` (display label), not `<label>`.** The `<label>` element is not valid in the Role metadata type; the display name goes in `<name>`. The DeveloperName (API name) is inferred from the filename.
- **RecordType XML may need an explicit `<fullName>` element.** `<fullName>` is the required identity element for a RecordType (a decomposed child of CustomObject). Source-format files often omit it and let it be inferred from the file path, but a deploy can fail with "element fullName missing for a child of type RecordType" — observed when selecting the record type with `--metadata RecordType:Object.RTName` rather than `--source-dir`. Fix: add `<fullName>RTName</fullName>` to the XML body (just the RT name, not the object-qualified form).
- **Role hierarchy, Person Accounts, and OWD sharing settings are Setup-UI-only on OrgFarm.** Deploying `Role` metadata via Metadata API against an OrgFarm org fails with a server-side "unexpected error" even on well-formed XML (confirmed via retrieve → re-deploy); other metadata types in the same org deploy fine, so this is a platform restriction, not an authoring bug. Same story for enabling Person Accounts and setting Account/Case OWDs — Setup-UI only, non-source-trackable. Create the role hierarchy by hand in **Setup → Users → Roles → Set Up Roles**, build it **top-down** (top role with no parent first, then each child picking its parent), and skip Role deploys thereafter. Don't debug the XML.
- **A metadata-only deploy blocked on Apex coverage means Apex is in the payload.** A deploy with no Apex (roles, profiles, record types, layouts) runs no tests and needs no test level. If a production-style org (e.g. OrgFarm Enterprise Edition — not a sandbox) rejects the deploy on the 75% coverage gate, Apex slipped into the payload; narrow the deploy to the metadata you intend. `--test-level NoTestRun` won't save a production deploy that *does* contain Apex — production runs tests whenever Apex is present.

## CI / GitHub Actions

- **A GitHub org IP allow list blocks Actions runners before any workflow logic runs.** Symptom: `actions/checkout` fails with `HTTP 403 — The repository owner has an IP allow list enabled, and <IP> is not permitted to access this repository`, so every workflow dies before it reaches the `sf` CLI or intent trust-chain steps. Cause: standard GitHub-hosted runners have no fixed IPs and can't be allow-listed — and there's no "allow GitHub Actions" toggle (the allow-list auto-update option covers installed GitHub *Apps*, not hosted runners). Fix: use self-hosted runners, or GitHub-hosted *larger* runners with static IP ranges, and add their addresses to the org allow list (a load balancer fronting them keeps it to one range). Confirm by re-running a failed check — `actions/checkout` succeeds with no 403. Catch it at setup, not the first PR: capture it as a step in `delivery/deploy-runbook.md`.

## Experience Cloud (self-registration)

- **Configurable Self-Registration is not zero-Apex.** Experience Cloud's *Configurable Self-Registration* presents as declarative in the Login & Registration setup UI, but it's Apex-backed: selecting it makes Salesforce auto-generate a handler class (name begins `AutocreatedConfigSelfReg…`, implementing `Auth.ConfigurableSelfRegHandler`) that runs the `createUser` logic — the "configurable" refers to the form/fields, not the absence of code. You don't write the class from scratch, but you own it: customize it for the real registration logic and, because it's Apex in the org, cover it against the 75% gate before a production deploy. Don't scope customer or partner self-registration as "standard-first, no Apex" — budget the handler and its coverage.
- **The legacy `CommunitiesSelfRegController` scaffold ships with a registration-blocking bug.** The old `CommunitiesSelfRegController` self-registration scaffold assigns a `null` `ProfileId` directly to the `User` sObject, which throws `Field is not writeable: User.ProfileId`. The failure is **silent to the end user** — registration simply never completes, with no error surfaced on the page, so it looks like the form is broken rather than a code fault. Fixes: prefer Configurable Self-Registration (whose auto-generated handler takes the profile through `createUser`), or patch the legacy handler to set a valid `ProfileId` before the insert. Catch it early — a self-reg flow that "does nothing" on submit is this bug until proven otherwise.

## Flow XML (Metadata API)

- **Same-type elements must be grouped contiguously.** All `<recordLookups>` together, all
  `<assignments>` together, etc. Interleaving by execution order errors "Element ... is duplicated
  at this location in type Flow."
- **Picklist values in formulas need `TEXT()`.** Concatenating a picklist field directly errors
  "Picklist fields are only supported in certain functions"; wrap it: `TEXT({!picklist})`.

## Apex / tests

- **Never seed geolocation test coords as `0`.** `Location` / geolocation compound fields handle
  equator/prime-meridian `0.0` unreliably — a record at `(0, 0.1)` can be skipped as if it had no
  geo, silently breaking distance assertions. Use clearly non-zero lat/lng.
- **Type coordinate-taking helper params as `Decimal`, not `Double`.** Apex infers `0` as `Integer`
  and `0.1` as `Decimal`; a `Double` signature rejects the integer literal and a mixed call is a
  signature-mismatch deploy error. `Decimal` accepts both.
- **Record-triggered Flows can form a live chain in tests.** If status transitions cascade (Flow A's
  write meets Flow B's entry criteria), inserting a record mid-lifecycle auto-runs downstream
  automation and pollutes state for a test meant to exercise one piece. Seed at an inert status
  (e.g. `Draft`) that triggers nothing when you need isolation.
- **Orgfarm Case custom-field deploy may silently no-op.** `sf project deploy start` with a CustomField
  on Case can report "Succeeded, 1/1 component deployed" against an orgfarm sandbox while leaving no
  trace in the schema (zero `__c` fields visible via `getDescribe().fields.getMap()`, SOQL, or
  `FieldDefinition`). Hit on 2026-10-06 deploying `Case.PHI_Flagged__c` from develop (INT-026/027) —
  three deploy IDs all reported success; field never materialized. Confirm post-deploy via SOQL or
  Setup → Object Manager → Case, not the CLI's summary table.
