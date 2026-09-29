# Deployment runbook — standing up this engagement on a fresh org

The ordered, **deployment-relevant** steps to bring a clean sandbox to a working state: the metadata
deploy, plus the org configuration the deployed code depends on but that **cannot ride the metadata
deploy** (Setup toggles, Setup-data records, scheduled jobs).

**Scope — what's in / out.** This is a *deployment* runbook, not demo setup. Keep **out** anything
the code runs correctly without: sample-data seeding, demo-persona/user wiring, geo backfills. Those
make a populated demo but aren't required for the system to function — link them from the phase
READMEs instead. Keep **in** only steps a fresh org genuinely needs to make the deployed code behave.

**How this is maintained.** Each delivering PR records its own non-deployable steps in the PR
template's **§4 "Done manually / outside this diff"** table — that's the per-change capture. This
runbook is the **consolidated, ordered** home those steps roll up into. When a PR's §4 adds a step
that is deployment-relevant (not demo data), add it here in dependency order and cross-link the PR.

**When you add a step, keep it executable.** This is a list someone hands to an admin (or agent) and
runs top to bottom, so:
- One step is a **line item or table row** — never a heading. Headings mark the ordered *sections*
  below (features → deploy → Setup-data → jobs), not individual steps.
- Order by **execution sequence, not by intent.** Tag the intent id on the line (`(INT-042)`) as a
  datapoint; don't section the runbook intent-by-intent.
- Keep it to **the action** (and at most a one-line `Verify:`). The *why* — classification rationale,
  KA references — stays in the per-intent `intents/INT-00x/deployment-plan.md`; link it, don't inline it.
- Write each step in **plain language a customer admin can follow** — a clear imperative action, no
  undecoded internal shorthand (KA numbers, control-framework jargon). Same readability bar as an
  intent statement, so a human and an agent both read it the same way.
- **Dedup before adding** — if the step (or an equivalent) is already here, don't add it again.

**Add preconditions when you *design*, not only when a PR trips over them.** §4 rollup is
retrospective — it captures what someone already hit. A **greenfield** org additionally needs the
standard-cloud setup the build *assumes* but no intent names: a Default Case Owner, an Org-Wide Email
Address, Business Hours, a queue, assignment defaults. Nothing deploys these and no intent owns them,
so on a fresh org the metadata lands clean and the increment still doesn't work. `/ql-design-intent`
asks what must already be true about the org for a design to behave and routes the answers here —
add them as they're identified, ahead of the build, rather than after the first person debugs one.
Which setup a given feature actually requires is a platform fact that moves by release: confirm it
against Salesforce documentation instead of working from a remembered checklist.

Legend: 🔁 reversible · ⛔ irreversible · ▶️ anon Apex · ⚙️ Setup UI · 📦 metadata deploy

---

## Go-live gate

Prerequisites that must be true **before this engagement goes live** — and that **no single
intent's deployment plan owns**: a production URL/endpoint to swap in, an external approval, a
credential/token rotation, a DNS or firewall change, a customer sign-off. Nothing deploys these and
no test proves them, so clearing them is the Trusted Guide's call at go-live — this list just makes
sure none of them goes dark.

**Capture a prerequisite the moment you find one** — mid-build, mid-QA, wherever it surfaces. Add a
line here rather than trusting it to a runbook step buried below or a Jira ticket the repo can't see.
One checkbox per prerequisite; check it off when it's cleared. (`👤` go-live gates that
`/ql-generate-deployment-plan` finds per intent roll up here too.)

> Replace this with this engagement's real prerequisites — one `- [ ]` checkbox per prerequisite.
> Examples: swapping a reCAPTCHA/Turnstile placeholder for the production site key once the prod
> URL is registered; customer IT confirming the integration user is provisioned in production.

Surface what's still open at any time (advisory — never blocks):

```bash
node scripts/intent-ledger.mjs golive
```

---

## Order of operations

> Replace the examples below with this engagement's real steps. The ordering — features/toggles
> first, then deploy, then Setup-data the code reads, then scheduled jobs — is the durable part.

### 1. ⚙️ Org features / toggles — *before the metadata deploy where the model depends on them*
Features that must be enabled before metadata referencing them will deploy or behave (e.g. Person
Accounts, multi-currency, a cloud/feature license). Note ⛔ for irreversible enablements. Cross-link
the PR/phase that introduced each.

### 2. 📦 Deploy metadata
```bash
sf project deploy start -o <org-alias>
```
Deploys objects/fields, Apex, Flows, permission sets, layouts, apps, etc. When deploying a subset,
deploy **classes/fields before Flows** that reference them — `rollbackOnError` is whole-transaction
and will silently un-deploy a class if a co-bundled Flow fails (`build-notes.md`).

### 3. ⚙️ Create Setup-data records the code reads
Records that are **not** deployable metadata (or that fail the source-deploy path — e.g.
CustomMetadata *records*; see `build-notes.md`). Pattern: the deployed Apex falls back to a hardcoded
default when each is absent, so the system runs without them but with default behavior. List each:
what it is, the field(s), the fallback, and the exact Setup location.

- **🔁 Business Hours** *(if any SLA/timer intent uses `BusinessHours.add()`)* — Setup → Company
  Settings → Business Hours. Define the working window; **leave non-working days BLANK** (a day saved
  as `00:00–00:00` reads as *open 24h*, not closed — see `build-notes.md`). Verify with
  `BusinessHours.isWithin(id, <a non-working day>)` → must be `false`. Business Hours are **not**
  Apex-insertable or deployable — Setup UI only.
- **🔁 CustomMetadata records** *(thresholds, rate tables, tier config)* — Setup → Custom Metadata
  Types → Manage Records. Only needed to override the Apex default.
- **🔁 Named credentials / external service config** *(if integrations are live)* — per the
  integration's decision file.

### 4. ⚙️ Enable features used by routing/automation *(when the consuming intent ships)*
e.g. Omni-Channel for queue routing, Email Deliverability, Experience Cloud. Queues/objects deploy;
the feature toggle + runtime config are Setup.

### 5. ▶️ Schedule operational jobs
Scheduled-Apex / cron jobs the runtime needs (e.g. an SLA-scan job). Note that schedule-*triggered*
Flows can't run sub-daily — sub-daily cadence lives in a `Schedulable` Apex run once via anon Apex.
Give the exact command and how to reverse it (`System.abortJob`).
```bash
sf apex run --file scripts/apex/<schedule-job>.apex -o <org-alias>
```

---

## Quick checklist (fresh org)

- [ ] 1. Org features / toggles enabled (mark ⛔ irreversible ones)
- [ ] 2. `sf project deploy start`
- [ ] 3. Setup-data records created (Business Hours with **non-working days blank**; CMDT records if non-default)
- [ ] 4. Routing/automation features enabled (when their intents ship)
- [ ] 5. Scheduled jobs installed
- [ ] _(optional, demo only)_ seed + persona-wiring scripts — see phase READMEs, **not** required for the code to run
