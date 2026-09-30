---
intent: INT-002
scope_hash: 98930aaa774d
authored: 2026-09-30
---

# INT-002 — Design

## Data model
Existing `User.Region__c` (INT-005) is the region attribute the JIT handler stamps. `LanguageLocaleKey` is the standard User field the JIT handler stamps from the SAML `Language` attribute.

## Sharing & security
JIT handler creates the User with the **Standard User** profile plus the region's `Assessor_Base` permission set (INT-005). It **never** grants any Medical_History__c-access perm set (guardrail 2 — the break-glass path stays out of the SAML pipeline).

## Automation approach
`Auth.SamlJitHandler` interface implementation. Standard Salesforce JIT pattern. No custom callouts, no Apex triggers.

## Integration (SAML)
Three `SamlSsoConfig` records — one per regional AD — reference the same `SamlJitHandler` Apex class. **`SamlSsoConfig` deploy defers** to runbook: real IdP metadata (entity ID, certificate, SSO endpoint) is a cross-team handoff with PTSF IT and can't be authored in-repo without leaking credentials or shipping dummy certs that break the trust.

## Alternatives considered
- **Single global AD federation** — rejected in scope (`out_of_scope`).
- **Just-in-Time via a Flow** — Salesforce doesn't support that; JIT handler must be Apex.

## Neighboring & future scope
- Built on: INT-005 (User.Region__c, Assessor_Base perm set).
- Builds on this: INT-020 (row-level scoping) will filter records for the JIT-provisioned user once they land.
- External dep — the three IdP metadata packages — is declared in the intent's `## Dependencies`.

## Open design questions
_none_
