---
intent: INT-002
phase: 1
proof_hash: 98930aaa774d
authored: 2026-09-30
---

# INT-002 — Test script

## Criteria

| ID | Criterion | How proven | Type | Sign-off |
|----|-----------|------------|------|----------|
| INT-002-C1 | Apex class `SamlJitHandler` implements `Auth.SamlJitHandler` and compiles | org-probe (ApexClass exists, no compile error) | ✅ | (verify — green, 2026-09-30) |
| INT-002-C2 | `SamlJitHandler.createUser` stamps `Region__c` and `LanguageLocaleKey` from the SAML `Region` / `Language` attributes | `SamlJitHandlerTest.createUserStampsRegionAndLanguage` | ✅ | (CI) |
| INT-002-C3 | `SamlJitHandler.createUser` throws when SAML `Region` is missing or not in {EMEA,AMER,APAC} (guardrail — no cross-region default) | `SamlJitHandlerTest.rejectsUnknownRegion` | ✅ | (CI) |
| INT-002-C4 | `SamlJitHandler.createUser` assigns `Assessor_Base` permission set and does NOT assign any Medical_History-access perm set (guardrail 2) | `SamlJitHandlerTest.assignsBaseNotPHI` | ✅ | (CI) |
| INT-002-C5 | Three `SamlSsoConfig` entries (EMEA_AD, AMER_AD, APAC_AD) reference `SamlJitHandler` and each region's login-URL routing works — 📋 accepted by Prashant Kumar — runbook-INT-002.md (needs PTSF IT IdP metadata + certs; can't ship in metadata safely) | 📋 | 📋 | — |
| INT-002-C6 | End-to-end: an EMEA user SAML-authenticates and lands in Salesforce with Region__c=EMEA, Language=fr (acceptance) | Manual scene A (post-IdP handoff) | 👁 | _pending_ |

## Manual validation scenes

### Scene A — End-to-end SAML login (C6)
1. PTSF IT provides EMEA AD IdP metadata + test user credentials.
2. Configure the `EMEA_AD` SamlSsoConfig in Setup with the real metadata (per runbook).
3. From the region's IdP-initiated login, authenticate as an EMEA test user with SAML attribute `Region=EMEA, Language=fr`.
4. Confirm the new User row has Region__c=EMEA, LanguageLocaleKey=fr, and is assigned `Assessor_Base`.
5. Confirm no PHI perm set (`Medical_History_Break_Glass` or equivalent) is present.
**Sign-off:** _name / date / pass·fail_.

## Deliberately not tested

- Patient/practitioner authentication — INT-003 owns those flows.
- Global AD federation — explicitly out of scope.
