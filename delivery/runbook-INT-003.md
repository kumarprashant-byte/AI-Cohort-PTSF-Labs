# INT-003 — Deploy runbook

**Intent:** Patient and practitioner login (email/password, Facebook, and partner path)
**Delivered:** 2026-09-30

## What ships in the deploy
- Contact RecordTypes: `Patient`, `Practitioner`
- Contact field `Practitioner_Vetting_Status__c` (Pending/Approved/Rejected)

## Post-deploy Setup click-through
1. **Facebook Auth Provider** (Setup → Auth. Providers → New → Facebook): create a Facebook Developer App, paste client ID + secret. Test with a dev user.
2. **Patient Portal (LWR site)**: Setup → Digital Experiences → New → LWR template. Assign Patient Portal profile; enable self-registration; wire the Facebook Auth Provider to the login page.
3. **Practitioner Community**: Setup → Digital Experiences → New → Customer Community Plus template (partner license per G0401). Enable self-registration with a custom handler that sets RecordType=Practitioner and Vetting_Status=Pending; **do not** provision a Partner Community license on registration (guardrail 2).
4. **Vetting queue**: Setup → List Views on Contact — "Pending Practitioner Vetting" filter: `Practitioner_Vetting_Status__c = Pending AND RecordType = Practitioner`. Admin approves inline and then provisions the Partner license.
5. **Password reset flows**: enable and localize per each site's supported languages.

## Guardrails enforced
- Guardrail 1 (no merge of Patient / Practitioner Contacts): RecordType boundary + a Duplicate Rule scoped per RecordType keeps them apart.
- Guardrail 2 (no premature Partner license): Vetting_Status default is Pending; license provisioning is a manual admin step after Approved.

## What is NOT in this deploy
- Experience Cloud sites, Facebook Auth Provider, self-registration handlers, password-reset flows (📋 above).
