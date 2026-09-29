public without sharing class AssessmentShareService {

    public static void grantEditToAssignmentOwner(List<Assessment__c> newAssessments) {
        Set<Id> assignmentIds = new Set<Id>();
        for (Assessment__c a : newAssessments) if (a.Assignment__c != null) assignmentIds.add(a.Assignment__c);
        if (assignmentIds.isEmpty()) return;

        Map<Id, Assignment__c> assignmentsById = new Map<Id, Assignment__c>(
            [SELECT Id, OwnerId FROM Assignment__c WHERE Id IN :assignmentIds]
        );

        List<Assessment__Share> shares = new List<Assessment__Share>();
        for (Assessment__c a : newAssessments) {
            Assignment__c parent = assignmentsById.get(a.Assignment__c);
            if (parent == null || parent.OwnerId == null) continue;
            if (parent.OwnerId == a.OwnerId) continue; // owner already has full access
            shares.add(new Assessment__Share(
                ParentId = a.Id,
                UserOrGroupId = parent.OwnerId,
                AccessLevel = 'Edit',
                RowCause = Schema.Assessment__Share.RowCause.Manual
            ));
        }
        if (!shares.isEmpty()) {
            Database.SaveResult[] results = Database.insert(shares, false);
            for (Database.SaveResult r : results) {
                if (!r.isSuccess()) {
                    for (Database.Error e : r.getErrors()) {
                        System.debug(LoggingLevel.WARN, 'AssessmentShare insert failed: ' + e.getMessage());
                    }
                }
            }
        }
    }
}
