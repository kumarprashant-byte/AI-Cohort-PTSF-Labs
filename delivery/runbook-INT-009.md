# INT-009 — Deployment runbook

**Intent:** Practitioner community + geolocation-based auto-assignment
**Delivered:** `Assignment__c`, `Practitioner_Specialty__c`, `Subsidy_Application__c` (scaffold), `Treatment_Type__c`, Contact extensions (`Region__c`, `Location__c`, `Capacity_Max__c`, `On_Leave__c`).

## 1. Deploy metadata

```bash
sf project deploy start \
  --source-dir force-app/main/default/objects/Treatment_Type__c \
  --source-dir force-app/main/default/objects/Contact \
  --source-dir force-app/main/default/objects/Subsidy_Application__c \
  --source-dir force-app/main/default/objects/Practitioner_Specialty__c \
  --source-dir force-app/main/default/objects/Assignment__c \
  --wait 15
```

## 2. Deferred — post-deploy Setup steps

### 2a. Distance formula on Assignment__c

Setup → Object Manager → Assignment → Fields → New Formula `Distance_km__c` (Number, 2 decimals):

```
DISTANCE(Application__r.Patient__r.Location__c, Owner:User.Contact.Location__c, 'km')
```

Verify Q-design-009-2 (cross-object depth ≤ 5). If the traversal fails, fall back to storing distance at assignment-time via `AssignmentSelector`.

### 2b. Load tracking on Contact

Two paths (see design § Data model):

- **Path A (recommended by design):** convert `Assignment__c.Practitioner_Contact__c` to Master-Detail to Contact, then add roll-up summary `Contact.Current_Load__c` = COUNT of Assignment__c where `Status__c IN ('Assigned','Accepted')`. Note: Assignment__c cannot then also be M-D to Application — hence the Lookup for Application (see `decisions/2026-09-29-INT-009-assignment-lookup.md`).
- **Path B:** compute `Current_Load__c` at query time inside `AssignmentSelector` (Apex `COUNT()` per candidate). Simpler metadata, more query overhead.

### 2c. Automation

- **Apex trigger `SubsidyApplicationTrigger`** on `Subsidy_Application__c` after update — enqueue `AssignmentSelector` when Status transitions to `Awaiting_Practitioner`.
- **Queueable `AssignmentSelector`** — SOQL (see design § Automation approach 2).
- **Apex trigger `AssignmentTrigger`** on `Assignment__c` after update — Status Reassigned/Declined re-enqueues Selector; Status Accepted sets `Accepted_Date__c` (and hands off to INT-019's manual-share trigger).

### 2d. Partner Community

- Enable Digital Experiences.
- Create Community `Practitioner Portal` (Partner Community license).
- Configure Sharing Set for Assignment__c: `OwnerId = User.Id` — grants a practitioner Community User read/edit on their own assignment records.
- Enable Practitioner Contacts as Community Users (Setup → Users → Enable Partner User on the Contact).

### 2e. Geocoding

- Setup → Data Integration Rules → enable the geocoding Clean Rule on Contact (native, free).
- If unavailable, author `ContactAddressTrigger` for Google Maps callout — needs a Named Credential and adds a `## Dependencies → External` entry via `/ql-refine-intent INT-009`.
