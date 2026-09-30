# INT-015 — Deployment runbook

Runbook-only intent. No metadata rides the deploy; every component is Setup click-through.

## 1. License enablement
- Digital Engagement (Messaging for In-App/Web)
- Einstein Bot user licenses
- Salesforce Knowledge

## 2. Knowledge base
Setup → Knowledge → Enable. Article Type: `PTSF FAQ`.
- Data Categories: `Topic` (Onboarding / Subsidy / Assessment / General).
- Language settings: `en_US`, `fr`, `de`, `zh_CN`, `ja` matching `Contact.Language_Preference__c`.
- Seed the top 25 FAQ articles from the current static website, translated for each language.

## 3. Einstein Bot (per language)
Setup → Einstein Bots → New (one per language).
- Intents: top 10 FAQ intents (map to Knowledge articles).
- Fallback → escalate to Omni-Channel.
- Guardrail 2: do NOT grant the bot user profile access to `Medical_History_Entry__c` — verify in Scene A.

## 4. Omni-Channel routing
Setup → Omni-Channel Settings → Enable.
- Skills: `Language_en_US`, `Language_fr`, `Language_de`, `Language_zh_CN`, `Language_ja`, `Region_EMEA`, `Region_AMER`, `Region_APAC`.
- Routing: skills-based, presence-based fallback. Fallback rule: EMEA→AMER→APAC when no in-region agent is Available for >2 minutes.
- Assessor users (from INT-020) get their region + language skills assigned.

## 5. Messaging embed
Setup → Embedded Service Deployments → New.
- Deploy A: Patient Portal (LWR site from INT-006). Bot: patient FAQ bot.
- Deploy B: Practitioner Community (INT-003). Bot: practitioner FAQ bot.

## 6. Smoke test
Run the acceptance walkthrough (Scene C in the test script).
