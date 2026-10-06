---
intent: INT-011
executed_by: Prashant Kumar
executed_at: 2026-10-06
environment: ptsf (orgfarm epic.out.e68d765f4115)
branch: scope/INT-026-finish
commit: 63e72dc71aff8ec7b601586873823f2f4b73970b
type: manual
---

# Test Execution Report — INT-011 — 2026-10-06

**Intent:** Digital assessment form with specialist re-referral
**Environment:** ptsf (orgfarm epic.out.e68d765f4115)
**Branch @ HEAD:** `scope/INT-026-finish` @ `63e72dc`
**Executed by:** Prashant Kumar
**Executed at:** 2026-10-06

## Scenes attempted

### Scene A — End-to-end assessment lifecycle (criterion C8)

| Step | Result | Notes |
|------|--------|-------|
| 1. Ensure practitioner community user with `Practitioner_Access` PSG exists | ⚠️ NOT RUN | 0 practitioner community users in orgfarm. Experience Cloud site provisioning + Contact-to-User conversion needed. |
| 2. Insert accepted Oncology Assignment | ⚠️ NOT RUN | 0 `Treatment_Type__c` records in orgfarm (schema CMT lookup `Assessment_Form.Oncology` has no matching parent row). |
| 3. Log in as practitioner, open Assignment in community | ⚠️ NOT RUN | No community user, no community site. |
| 4. Confirm Assessment LWC renders Oncology form | ⚠️ NOT RUN | Blocked by step 3. |
| 5. Fill fields + Save Draft | ⚠️ NOT RUN | Blocked by step 3. |
| 6. Return + reload draft | ⚠️ NOT RUN | Blocked by step 3. |
| 7. Complete + Submit → Pending Review + Submitted Date | ⚠️ NOT RUN | Blocked by step 3. |
| 8. Open another practitioner's Assignment via URL → confirm invisible | ⚠️ NOT RUN | Blocked by step 3. |

**Criteria outcome:** C8 ⚠ environment not ready (community site + seed data + practitioner user missing).

## Environment blockers

1. **Experience Cloud site not provisioned** in orgfarm (the practitioner-facing community the LWC renders in).
2. **0 practitioner community users** — needs Contact + Experience Cloud user creation.
3. **0 `Treatment_Type__c` records** — the `Assessment_Form.Oncology` CMT points to a Treatment_Type__c that doesn't exist, so the LWC's schema lookup would miss.
4. **0 Assignments and 0 Assessments** — no lineage to open.

## Structural evidence that DID pass

Independent of the manual scene:

- All C1 object-shape assertions remain green per `intents/INT-011/verify-evidence/2026-09-30-verify.md` (object exists, required fields exist, types correct).
- C2–C7 Apex tests remain green in CI (`AssessmentFormControllerTest`, `AssessmentSharingTest`, `AssessmentAttachmentTest`).
- Today's work closed a latent gap: `Response_JSON__c` now carries edit FLS on `Assessor_Base`, `Submitted_Date__c` + `Assigned_Date__c` carry read FLS on `Assessor_Base` and `Team_Manager_Base`, all three carry edit FLS on `PTSF_Admin_Fls_Overrides` (commit `63e72dc`). Before this, the LWC's save-draft and submit paths would have silently no-oped for anyone except users with `Practitioner_Assessment_Access` already assigned.

## Summary

**Criteria attempted:** 1 · **Passed:** 0 · **Blocked by environment:** 1 · **Not run:** 0
**Defects filed:** none (no behavior tested; blockers are environment, not code)
**Recommended next step:** Provision an Experience Cloud community site in ptsf OR move INT-011 Scene A to a sandbox that already has one (e.g. the build sandbox named in INT-005's runbook: `apac.practitioner@ptsf.test.invalid`). Create Treatment_Type__c seed records (Oncology, Cardiology, Orthopaedic, General) via a one-shot Apex script. Then re-run this report.
