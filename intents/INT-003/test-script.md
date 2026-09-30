---
intent: INT-003
phase: 1
proof_hash: 52afeb7e32a8
authored: 2026-09-30
---

# INT-003 — Test script

## Criteria

| ID | Criterion | How proven | Type | Sign-off |
|----|-----------|------------|------|----------|
| INT-003-C1 | Contact RecordTypes `Patient` and `Practitioner` are active | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-003-C2 | `Contact.Practitioner_Vetting_Status__c` picklist exists with values Pending / Approved / Rejected | org-probe | ✅ | (verify — green, 2026-09-30) |
| INT-003-C3 | Experience Cloud sites Patient Portal + Practitioner Community + Facebook Auth Provider + self-registration flows (real Facebook Dev App, per-site login pages, partner license SKU) | 📋 accepted by Prashant Kumar — delivery/runbook-INT-003.md | 📋 | accepted-gap |
| INT-003-C4 | End-to-end: patient registers via Facebook, lands on onboarding entry; separately practitioner self-registers, admin approves, then logs in (acceptance) | Manual scene A (post-runbook) | 👁 | _pending_ |

## Manual validation scenes

### Scene A — Dual login flows (C4)
1. Patient: from Patient Portal login page, click Facebook, complete Facebook login with a test dev-app user. Confirm a Contact row is created with RecordType=Patient and land on the onboarding entry (INT-006 wizard).
2. Practitioner: from Practitioner Community login page, click "Register as Practitioner", complete the form. Confirm a Contact with RecordType=Practitioner and Practitioner_Vetting_Status__c=Pending; no Community license yet.
3. Admin: change Vetting_Status to Approved. Provision Partner Community license.
4. Practitioner logs in — lands on the community home page.
**Sign-off:** _name / date / pass·fail_.
