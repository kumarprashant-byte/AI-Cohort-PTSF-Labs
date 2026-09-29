trigger AssessmentShareTrigger on Assessment__c (after insert) {
    AssessmentShareService.grantEditToAssignmentOwner(Trigger.new);
}
