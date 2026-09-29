# Target Org Rules — PTSF Patient Travel Support

> Reference role: hard constraints on what the build agent may and may not do in the target org. Read once; never violate without explicit user override.

## Org identity
- **Name:** `PTSF Build Sandbox`
- **Type:** sandbox
- **Build allowed:** yes
- **Posture:** Greenfield — no existing customizations assumed

## Hard rules

- This is a **greenfield** build. Assume no pre-existing customizations beyond the standard Salesforce setup the connection provides.
- Do not deploy to production without an explicit `"deploy to production"` instruction from the user.
- Permission sets only — do not modify standard profiles (System Administrator, Standard User).
- Idempotent: before creating any metadata, check whether it already exists. Update in place if the spec has changed.
- Use API names from `03-glossary-and-naming.md`. If a name is not listed, ask before inventing.

## Existing customizations
**None assumed.** If the agent finds existing customizations on first connection, stop and report them; do not modify or delete.

## Profiles to leave untouched
- System Administrator
- Standard User
- Any other standard profile

## Managed packages
_(None assumed in scope. If a managed package install becomes necessary mid-build, surface it to the user before installing.)_

## Operational rules
- **Sandbox first.** Production deploys require an explicit `"deploy to production"` instruction from the user.
- **Idempotent builds.** Before creating any metadata, check whether it already exists. If it does, update only if the spec has changed.
- **Deltas, not bulk.** When the user revises a phase brief mid-build, diff against current org and apply only the changes.
- **Permission sets, not profiles.** Grant access via permission sets. Do not modify standard profiles.
- **Test data only on request.** Sample/seed data loads only when the user explicitly approves.

## How scope is written (for your interpretation)

Scopezilla writes in two registers and tries not to mix them:

- **Business intent** — "Reps need a one-page meeting prep brief accessible from the account" — *your* job to map to the right Salesforce construct.
- **Real platform terms** — "CPQ explicitly out of scope," "native Quote object, not CPQ" — Scopezilla uses the genuine platform name when it knows the decision is platform-level. These are pre-decided.

If you encounter Salesforce-shaped language that doesn't match a real metadata type or feature (e.g., something that *sounds* like a feature name with custom labels stuck on it), treat it as business intent that was written too eagerly — translate to outcome and pick the platform construct yourself. Don't search for the literal feature.
