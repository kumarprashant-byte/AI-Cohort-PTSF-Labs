trigger AssignmentShareTrigger on Assignment__c (after update) {
    List<Assignment__c> toGrant = new List<Assignment__c>();
    List<Assignment__c> toRevoke = new List<Assignment__c>();
    for (Assignment__c a : Trigger.new) {
        Assignment__c prior = Trigger.oldMap.get(a.Id);
        Boolean wasAccepted = prior != null && prior.Status__c == 'Accepted';
        Boolean isAccepted  = a.Status__c == 'Accepted';
        if (!wasAccepted && isAccepted) toGrant.add(a);
        else if (wasAccepted && !isAccepted) toRevoke.add(a);
    }
    if (!toGrant.isEmpty())  AssignmentShareService.grantForAssignments(toGrant);
    if (!toRevoke.isEmpty()) AssignmentShareService.revokeForAssignments(toRevoke);
}
