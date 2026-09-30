# INT-002 — Deploy runbook

**Intent:** Federate three regional Active Directories with JIT provisioning
**Delivered:** 2026-09-30

## What ships in the deploy
- `SamlJitHandler.cls` — implements `Auth.SamlJitHandler`; stamps User.Region__c + LanguageLocaleKey from SAML attributes; assigns Assessor_Base perm set; rejects unknown regions.
- `SamlJitHandlerTest.cls` — 3 tests, all green.

## Post-deploy click-through (SamlSsoConfig, MyDomain, login routing)

Requires SAML metadata + certificates from **PTSF IT / regional AD admins** (declared as external dependency on the intent). Ship the code, wire in Setup:

1. **Enable MyDomain** if not already active (Setup → My Domain).
2. **Create three SAML SSO settings** (Setup → Single Sign-On Settings → New):
   - `EMEA_AD` — paste EMEA AD SAML metadata; **Just-in-Time Provisioning** = Enabled; **SAML JIT Handler** = `SamlJitHandler`; **Execute as** = a bootstrap admin user.
   - `AMER_AD` — same with AMER metadata.
   - `APAC_AD` — same with APAC metadata.
3. **Configure Login Discovery / My Domain login page** to route each region's users to their IdP (typically an email-domain-suffix rule per region).
4. **SAML attribute contract** (agreed with PTSF IT): assertion must include `Region` ∈ {EMEA,AMER,APAC}, `Language`, `Email`, `FirstName`, `LastName`. Federation Identifier drives the User lookup.

## Guardrails enforced
- Guardrail 1 (no patient/practitioner federation): scope of the three SamlSsoConfigs is internal AD only — patient/practitioner auth is INT-003 with different providers.
- Guardrail 2 (no PHI perm set on JIT): `SamlJitHandler.assignBasePermSet` grants **only** `Assessor_Base`; test `assignsBaseNotPHI` proves no Medical/Break_Glass perm set is assigned.

## What is NOT in this deploy
- Live SamlSsoConfig entries (📋 above — needs IdP metadata).
- MyDomain enablement (org-level setting; deploy id can't create MyDomain).
