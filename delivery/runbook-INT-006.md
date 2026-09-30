# INT-006 — Deployment runbook

Metadata delivered: `Onboarding__c` object + fields, `HIC_Prefill_Requested__e` correlation fields, `Contact.Language_Preference__c`, `Contact.Onboarding_Complete__c`. Everything below rides Setup, not the metadata deploy.

## 1. Named Credential — Loqate
Setup → Named Credentials → New.
- Label: `Loqate Address Validation`
- URL: `https://api.addressy.com`
- Identity Type: Named Principal
- Authentication: Custom Header, `Auth-Token: <LOQATE_API_KEY>`
Store the key in a protected custom metadata record; do not commit.

## 2. LWR Experience Cloud site — Patient Portal
Setup → Digital Experiences → New.
- Template: Build Your Own (LWR)
- URL: `/patient`
- Enable public site guest access; restrict to `Patient` Contact record type.
- Add pages: `Wizard`, `Summary`, `Dashboard`. Set localization for `en_US`, `fr`, `de`, `zh_CN`, `ja`.

## 3. LWC wizard (`onboardingWizard`)
Author against `Onboarding__c`. Each step commits `Payload_JSON__c` and advances `Step__c`. On step 1 mount, `@wire` publish `HIC_Prefill_Requested__e{Contact_Id__c, Onboarding_Id__c}` — never await. On Summary submit, invoke a subscribing Flow that:
- Flips `Contact.Onboarding_Complete__c = true`
- Selects welcome email template by `Contact.Language_Preference__c`
- Sends the email via `Messaging.SingleEmailMessage`

## 4. Email templates (5)
Setup → Email Templates → Classic or Lightning folder `PTSF Welcome`.
- `Welcome_en_US`, `Welcome_fr`, `Welcome_de`, `Welcome_zh_CN`, `Welcome_ja`.
Each references `{!Contact.FirstName}` and portal login URL.

## 5. Site guest permission set
Grant Read/Create on `Onboarding__c` (own records only via sharing rule), Read/Edit on `Contact` fields the wizard writes.

## 6. Smoke test
- Register a new Patient Contact with `Language_Preference__c = fr`.
- Complete wizard end-to-end, confirm French welcome email, confirm `Onboarding_Complete__c = true`, confirm INT-008 subsidy journey is now unlocked.
