# INT-001 — Deploy runbook

**Intent:** Provision capstone org and DevOps pipeline · **Target:** orgfarm-5f9310b41f (`epic.out.e68d765f4115@orgfarm.salesforce.com`)

## Metadata deploy (idempotent)

```
sf project deploy start --source-dir force-app --target-org epic.out.e68d765f4115@orgfarm.salesforce.com --wait 10
```

## BusinessHours seed (data, not metadata — see design Q-design-001-2)

Run once per fresh org:

```
sf data create record --sobject BusinessHours --values "Name='PTSF_APAC_Support' TimeZoneSidKey='Australia/Sydney' IsActive=true MondayStartTime='09:00:00.000Z' MondayEndTime='17:00:00.000Z' TuesdayStartTime='09:00:00.000Z' TuesdayEndTime='17:00:00.000Z' WednesdayStartTime='09:00:00.000Z' WednesdayEndTime='17:00:00.000Z' ThursdayStartTime='09:00:00.000Z' ThursdayEndTime='17:00:00.000Z' FridayStartTime='09:00:00.000Z' FridayEndTime='17:00:00.000Z'"
sf data create record --sobject BusinessHours --values "Name='PTSF_EMEA_Support' TimeZoneSidKey='Europe/London'    IsActive=true MondayStartTime='09:00:00.000Z' MondayEndTime='17:00:00.000Z' TuesdayStartTime='09:00:00.000Z' TuesdayEndTime='17:00:00.000Z' WednesdayStartTime='09:00:00.000Z' WednesdayEndTime='17:00:00.000Z' ThursdayStartTime='09:00:00.000Z' ThursdayEndTime='17:00:00.000Z' FridayStartTime='09:00:00.000Z' FridayEndTime='17:00:00.000Z'"
sf data create record --sobject BusinessHours --values "Name='PTSF_AMER_Support' TimeZoneSidKey='America/New_York' IsActive=true MondayStartTime='09:00:00.000Z' MondayEndTime='17:00:00.000Z' TuesdayStartTime='09:00:00.000Z' TuesdayEndTime='17:00:00.000Z' WednesdayStartTime='09:00:00.000Z' WednesdayEndTime='17:00:00.000Z' ThursdayStartTime='09:00:00.000Z' ThursdayEndTime='17:00:00.000Z' FridayStartTime='09:00:00.000Z' FridayEndTime='17:00:00.000Z'"
```

Holiday sets per region are a follow-on data load — deferred until INT-010 needs them.

## Verify (proof criteria)

```
sf data query -q "SELECT Name, TimeZoneSidKey, IsActive FROM BusinessHours WHERE Name LIKE 'PTSF_%'"    # INT-001-C1
sf sobject describe --sobject Deploy_Environment__c --json                                                # INT-001-C2
sf data query -q "SELECT Name FROM PermissionSet WHERE Name IN ('PHI_Emergency_Access','Practitioner_Medical_History_Read')"   # INT-001-C3
```
