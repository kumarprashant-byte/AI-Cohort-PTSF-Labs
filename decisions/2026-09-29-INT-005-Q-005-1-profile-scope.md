---
date: 2026-09-29
intents: [INT-005]
ratifier: Prashant Kumar
---

# INT-005 Q-005-1 — Regionalized profiles limited to the three the Build target names

## Context

`intents/INT-005/intent.md` carries `Q-005-1`: which profiles get regionalized (Assessor, Team Manager, Regional Ops Manager only, or every internal profile including Compliance Officer / System Administrator)? The Build target explicitly names only the three role labels. Compliance Officer and System Administrator sit outside those three by function — Compliance is cross-region by definition and SysAdmin is org-wide — so regionalizing them would create PSGs no persona is expected to use.

## Change

Q-005-1 answered as: **the three profiles named in the Build target only.** Nine PSGs deployed (3 profiles × 3 regions). Compliance Officer and System Administrator remain unregionalized.

## Consequences

- If Compliance Officer needs regional scoping later, add three PSGs (`APAC_Compliance_Officer`, `EMEA_Compliance_Officer`, `AMER_Compliance_Officer`) composed of a new `Compliance_Officer_Base` PS plus the existing `Region_<X>` marker PSs. Additive, not a rework.
- SysAdmin stays cross-region — the `PTSF_Global` root role gives cross-region users a home in the hierarchy without a regional branch.
- No hashed scope fields in `intents/INT-005/intent.md` changed — Q-005-1 is now answered in Grounding, not a build-target rewrite.
