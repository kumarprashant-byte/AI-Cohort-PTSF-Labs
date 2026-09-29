---
name: ql-contribute-to-launchpad
disable-model-invocation: true
description: Promote an improvement found while working in an engagement repo back upstream into the quantum-leap-launchpad plugin — placed in the right layer, with a PR opened.
produces: A branch + PR on the quantum-leap-launchpad plugin repo (or a direct push to main if asked) landing the change in the right layer. No engagement-repo output; the version bump is left to /ship.
---

# Contribute to launchpad — promote an engagement improvement upstream

Engagements are where real friction surfaces — a missing convention, a skill that would help every project, a template that needs another section. This skill takes such an improvement (already made or just described in the current engagement repo) and lands it in the `quantum-leap-launchpad` plugin so every future engagement inherits it.

It mirrors the layered structure of the plugin. The hard part isn't the git mechanics — it's putting the change in the layer that actually propagates and survives. Get that wrong and the contribution either doesn't reach new engagements or gets clobbered on the next `sf project generate`.

## Step 1 — Identify the contribution

Pin down *what* is being promoted and *where it currently lives* in the engagement repo. Common shapes:

- **A working convention** → lives in the engagement's `AGENTS.md` (likely below the `<!-- ENGAGEMENT:END -->` marker).
- **A skill** → a `.claude/skills/<name>/` directory.
- **A repo-scaffold asset** → e.g. `scripts/*.mjs`, a git hook, a `.github/` file, an `eslint`/`prettier` config.
- **A CI change** → `.github/workflows/*.yml`.
- **A PR-template change** → `.github/pull_request_template.md`.

If the change isn't made yet and the user is just describing it, treat their description as the spec and build it directly in the plugin (Step 4) rather than in the engagement repo.

## Step 2 — Locate the writable plugin checkout

`${CLAUDE_PLUGIN_ROOT}` points at the **installed (read-only) cache** — you cannot commit/push from there. You need the **git clone**.

```bash
# Prefer a sibling/known dev checkout; fall back to discovery.
for d in ~/code/quantum-leap-launchpad ~/quantum-leap-launchpad; do
  [ -d "$d/.git" ] && echo "FOUND: $d" && break
done
git -C <candidate> remote -v   # confirm origin is git.soma.salesforce.com/dgerow/quantum-leap-launchpad
```

If no writable clone exists, offer to clone it:

```bash
git clone https://git.soma.salesforce.com/dgerow/quantum-leap-launchpad.git ~/code/quantum-leap-launchpad
```

Record the resolved path as `$PLUGIN`. Confirm it's clean and up to date (`git -C "$PLUGIN" status`, `git -C "$PLUGIN" pull --ff-only` on `main`).

## Step 3 — Map the change to the right plugin layer

This is the load-bearing step. Place each kind of change where it propagates AND survives:

| Engagement-repo change | Goes in the plugin at | Propagation mechanism | Watch out for |
|---|---|---|---|
| AGENTS.md **convention / ethos** | `templates/AGENTS.md`, inside the `<!-- LAUNCHPAD:MANAGED:BEGIN/END -->` region | seeded by `init-engagement`, refreshed by `/ql-resync` (managed-region swap) | Put reusable convention prose *inside* the managed markers; **don't hand-edit the `LAUNCHPAD:MANAGED:VERSION` stamp — `/ship` recomputes it.** Never put engagement-specific content there (that's the `ENGAGEMENT` block / "Engagement notes", outside the region). |
| A **skill** | `skills/ql-<name>/SKILL.md` (engagement skill) or `.claude/skills/<name>/` (maintainer-only) | Vendored into engagement repos via `npx skills` and refreshed by the belt-and-suspenders update paths (`decisions/0012`); reaches an engagement when it re-vendors (`npx skills update` / the scheduled CI PR / the plugin's belt nudge). | **Prefix the name `ql-`** (both the dir and the frontmatter `name:`) — the namespace is lost under `npx` install, so the prefix is what prevents collisions with `sf-skills` etc. **Frontmatter must be strict-YAML clean** (no unquoted `: ` or leading backtick — use `>-`); `repo-check.py` gates this, and a violation makes the skill silently fail to install. If it's a *maintainer-only* skill (scaffold/release tooling that must never install), put it in `.claude/skills/` with `metadata.internal: true` and a bare (non-`ql-`) name; add shipped maintainer skills to `MAINTAINER_ONLY` in `gen-docs.py`. |
| **Static repo asset** (`scripts/`, `.github/` file, config) | `templates/<same path>` | `cp -R templates/.` overlay | Static files copy cleanly — no wiring needed. |
| **package.json wiring** (lint-staged entry, dep) | DON'T put in `templates/package.json` | recommend it in `init-engagement` (a step that edits the DX-generated package.json) | `sf project generate` owns and overwrites `package.json`; a template version gets clobbered. |
| **CI / PR template** | `templates/.github/...` | overlay | none beyond normal review. |

If a contribution spans layers (e.g. a skill + a CI step that runs its script), do all the pieces in one PR.

## Step 4 — Apply the change in the plugin

Branch off `main` (unless the user asked to push directly — see Step 5):

```bash
git -C "$PLUGIN" checkout main && git -C "$PLUGIN" pull --ff-only
git -C "$PLUGIN" checkout -b <short-kebab-slug>
```

Make the edits per the Step-3 mapping. For skills and assets, copy from the engagement repo so the upstream copy matches what's been validated:

```bash
cp -R "<engagement>/.claude/skills/<name>" "$PLUGIN/skills/<name>"
```

When copying a skill, scrub anything engagement-specific from its body — it must read generically (refer to "the engagement repo", not "PTSF"). The `check-scope` skill is a good reference: it names canonical paths (`intents/INT-NNN/intent.md`) that exist in every engagement, not one client's specifics.

> **Don't bump the version here.** Version bumps are owned exclusively by `/ship`, the release gate — it bumps `plugin.json`, writes release notes, and deploys the docs site as one atomic release. A contribution just lands the change on `main` (or a PR); the next `/ship` rolls it into a release and bumps the version then. This keeps every version bump tied to a deliberate release rather than scattering them across inbound contributions (which caused noisy `plugin.json` merge conflicts when several contributions raced). Engagements still pick up changes immediately via `/ql-resync`, which diffs plugin **content** against the repo — it does not depend on the version number.

## Step 5 — Ship it

Default: branch → commit → push → PR, and let the user merge.

```bash
git -C "$PLUGIN" add -A
git -C "$PLUGIN" commit -m "<type>: <what and why>"
git -C "$PLUGIN" push -u origin <branch>
GH_HOST=git.soma.salesforce.com gh pr create --title "..." --body "..."
```

Write the PR body to explain **why** (the engagement friction that motivated it), **what** changed by layer, and **how existing engagements pick it up** (`/ql-resync` reconciles engine scripts, the `AGENTS.md` managed region, and — opt-in — the CI/PR scaffold; skills refresh separately via `npx skills update`; append-only files like `build-notes.md` are flagged for hand-merge).

**If the user explicitly says push to main directly:** commit on `main`, `git push`. Skip the PR. Confirm afterward that `origin/main` advanced. (No version bump — that's `/ship`'s job.)

Either way, the engagement repo where the change originated already has it — no need to round-trip it back. Mention that existing OTHER engagements pick it up by running `/ql-resync` (with the plugin installed).

## What NOT to do

- **Don't** edit `${CLAUDE_PLUGIN_ROOT}` (the cache) — changes there are local, unversioned, and overwritten on plugin update. Always work in the git clone (`$PLUGIN`).
- **Don't** copy engagement-specific content upstream — client names, the `<!-- ENGAGEMENT -->` block, real data, org ids. Generalize first.
- **Don't** add a skill to `skills/` without registering it in both `init-engagement` and `resync` — it will silently fail to propagate.
- **Don't** put package.json wiring in `templates/package.json` — `sf project generate` clobbers it; recommend it in `init-engagement` instead.
- **Don't** bump the version here — that's `/ship`'s job (the release gate). `/ql-resync` detects drift by diffing plugin content against the repo, not the version number.
- **Don't** auto-merge a PR unless asked; don't push to `main` unless asked.
