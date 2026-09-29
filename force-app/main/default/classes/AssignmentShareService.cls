/**
 * INT-019 — Practitioner temporary access to Medical_History__c.
 *
 * Grants/revokes record-level access on Medical_History__c to the Assignment's practitioner
 * (Owner = Practitioner User). Uses standard Manual RowCause (design's declared deviation —
 * see decisions/2026-09-29-INT-019-manual-rowcause.md; the custom Practitioner_Assignment_Share
 * sharing reason wouldn't deploy on this org edition).
 *
 * Idempotent: grantForAssignments dedups against existing shares; revokeForAssignments deletes
 * only Manual-cause shares it owns.
 */
public with sharing class AssignmentShareService {

    public static void grantForAssignments(List<Assignment__c> assignments) {
        if (assignments == null || assignments.isEmpty()) return;

        Set<Id> applicationIds = new Set<Id>();
        Map<Id, Id> assignmentToOwner = new Map<Id, Id>();
        for (Assignment__c a : assignments) {
            if (a.Application__c != null && a.OwnerId != null) {
                applicationIds.add(a.Application__c);
                assignmentToOwner.put(a.Id, a.OwnerId);
            }
        }
        if (applicationIds.isEmpty()) return;

        Map<Id, Id> applicationToPatient = new Map<Id, Id>();
        for (Subsidy_Application__c app : [SELECT Id, Patient__c FROM Subsidy_Application__c WHERE Id IN :applicationIds]) {
            applicationToPatient.put(app.Id, app.Patient__c);
        }

        Set<Id> patientIds = new Set<Id>(applicationToPatient.values());
        patientIds.remove(null);
        if (patientIds.isEmpty()) return;

        Map<Id, List<Medical_History__c>> patientToHistories = new Map<Id, List<Medical_History__c>>();
        for (Medical_History__c mh : [SELECT Id, Patient__c FROM Medical_History__c WHERE Patient__c IN :patientIds]) {
            if (!patientToHistories.containsKey(mh.Patient__c)) {
                patientToHistories.put(mh.Patient__c, new List<Medical_History__c>());
            }
            patientToHistories.get(mh.Patient__c).add(mh);
        }

        Set<String> existingKeys = new Set<String>();
        Set<Id> allMhIds = new Set<Id>();
        for (List<Medical_History__c> mhs : patientToHistories.values()) {
            for (Medical_History__c mh : mhs) allMhIds.add(mh.Id);
        }
        if (!allMhIds.isEmpty()) {
            for (Medical_History__Share s : [SELECT ParentId, UserOrGroupId FROM Medical_History__Share WHERE ParentId IN :allMhIds AND RowCause = 'Manual']) {
                existingKeys.add(s.ParentId + '|' + s.UserOrGroupId);
            }
        }

        List<Medical_History__Share> toInsert = new List<Medical_History__Share>();
        for (Assignment__c a : assignments) {
            Id patientId = applicationToPatient.get(a.Application__c);
            if (patientId == null) continue;
            List<Medical_History__c> histories = patientToHistories.get(patientId);
            if (histories == null) continue;
            for (Medical_History__c mh : histories) {
                String key = mh.Id + '|' + a.OwnerId;
                if (existingKeys.contains(key)) continue;
                toInsert.add(new Medical_History__Share(
                    ParentId = mh.Id,
                    UserOrGroupId = a.OwnerId,
                    AccessLevel = 'Read',
                    RowCause = 'Manual'
                ));
                existingKeys.add(key);
            }
        }
        if (!toInsert.isEmpty()) {
            Database.SaveResult[] results = Database.insert(toInsert, false);
            List<Audit_Log__c> logs = new List<Audit_Log__c>();
            for (Integer i = 0; i < results.size(); i++) {
                if (results[i].isSuccess()) {
                    Medical_History__Share s = toInsert[i];
                    logs.add(new Audit_Log__c(
                        User__c = s.UserOrGroupId,
                        Action__c = 'Manual_Share_Insert',
                        Target_Object_Type__c = 'Medical_History__c',
                        Target_Object_Id__c = String.valueOf(s.ParentId),
                        Timestamp__c = System.now()
                    ));
                }
            }
            if (!logs.isEmpty()) insert logs;
        }
    }

    public static void revokeForAssignments(List<Assignment__c> assignments) {
        if (assignments == null || assignments.isEmpty()) return;

        Set<Id> applicationIds = new Set<Id>();
        Map<Id, Id> assignmentToOwner = new Map<Id, Id>();
        for (Assignment__c a : assignments) {
            if (a.Application__c != null && a.OwnerId != null) {
                applicationIds.add(a.Application__c);
                assignmentToOwner.put(a.Id, a.OwnerId);
            }
        }
        if (applicationIds.isEmpty()) return;

        Map<Id, Id> applicationToPatient = new Map<Id, Id>();
        for (Subsidy_Application__c app : [SELECT Id, Patient__c FROM Subsidy_Application__c WHERE Id IN :applicationIds]) {
            applicationToPatient.put(app.Id, app.Patient__c);
        }
        Set<Id> patientIds = new Set<Id>(applicationToPatient.values());
        patientIds.remove(null);
        if (patientIds.isEmpty()) return;

        Set<Id> mhIds = new Set<Id>();
        for (Medical_History__c mh : [SELECT Id FROM Medical_History__c WHERE Patient__c IN :patientIds]) {
            mhIds.add(mh.Id);
        }
        Set<Id> ownerIds = new Set<Id>(assignmentToOwner.values());

        List<Medical_History__Share> toDelete = [
            SELECT Id, ParentId, UserOrGroupId
            FROM Medical_History__Share
            WHERE ParentId IN :mhIds
              AND UserOrGroupId IN :ownerIds
              AND RowCause = 'Manual'
        ];
        if (!toDelete.isEmpty()) {
            List<Audit_Log__c> logs = new List<Audit_Log__c>();
            for (Medical_History__Share s : toDelete) {
                logs.add(new Audit_Log__c(
                    User__c = s.UserOrGroupId,
                    Action__c = 'Manual_Share_Delete',
                    Target_Object_Type__c = 'Medical_History__c',
                    Target_Object_Id__c = String.valueOf(s.ParentId),
                    Timestamp__c = System.now()
                ));
            }
            delete toDelete;
            if (!logs.isEmpty()) insert logs;
        }
    }
}
