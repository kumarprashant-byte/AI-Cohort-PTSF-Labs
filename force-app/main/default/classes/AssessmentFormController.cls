public with sharing class AssessmentFormController {

    public class FormPayload {
        @AuraEnabled public String treatmentType;
        @AuraEnabled public String schemaJson;
        @AuraEnabled public Assessment__c existingAssessment;
    }

    @AuraEnabled(cacheable=true)
    public static FormPayload getFormSchema(Id assignmentId) {
        if (assignmentId == null) throw new AuraHandledException('assignmentId is required');

        Assignment__c assignment = [
            SELECT Id, Application__r.Treatment_Type__r.Name
            FROM Assignment__c WHERE Id = :assignmentId LIMIT 1
        ];
        String treatmentType = (assignment.Application__r != null && assignment.Application__r.Treatment_Type__r != null)
            ? assignment.Application__r.Treatment_Type__r.Name
            : null;
        if (String.isBlank(treatmentType)) treatmentType = 'General';

        List<Assessment_Form__mdt> forms = [
            SELECT Schema_JSON__c FROM Assessment_Form__mdt
            WHERE Treatment_Type__c = :treatmentType LIMIT 1
        ];
        String schemaJson = forms.isEmpty() ? '[]' : forms[0].Schema_JSON__c;

        List<Assessment__c> existing = [
            SELECT Id, Status__c, Response_JSON__c, Submitted_Date__c, Treatment_Type__c
            FROM Assessment__c
            WHERE Assignment__c = :assignmentId AND Parent_Assessment__c = null
            ORDER BY CreatedDate DESC LIMIT 1
        ];

        FormPayload out = new FormPayload();
        out.treatmentType = treatmentType;
        out.schemaJson = schemaJson;
        out.existingAssessment = existing.isEmpty() ? null : existing[0];
        return out;
    }

    @AuraEnabled
    public static Id saveDraft(Id assignmentId, String responseJson) {
        return upsertAssessment(assignmentId, responseJson, 'Draft', false);
    }

    @AuraEnabled
    public static Id submitAssessment(Id assignmentId, String responseJson) {
        return upsertAssessment(assignmentId, responseJson, 'Pending Review', true);
    }

    private static Id upsertAssessment(Id assignmentId, String responseJson, String status, Boolean stampSubmitted) {
        if (assignmentId == null) throw new AuraHandledException('assignmentId is required');

        Assignment__c assignment = [
            SELECT Id, Application__r.Treatment_Type__r.Name
            FROM Assignment__c WHERE Id = :assignmentId LIMIT 1
        ];
        String treatmentType = (assignment.Application__r != null && assignment.Application__r.Treatment_Type__r != null)
            ? assignment.Application__r.Treatment_Type__r.Name
            : 'General';

        List<Assessment__c> existing = [
            SELECT Id FROM Assessment__c
            WHERE Assignment__c = :assignmentId AND Parent_Assessment__c = null
            ORDER BY CreatedDate DESC LIMIT 1
        ];

        Assessment__c a = existing.isEmpty()
            ? new Assessment__c(Assignment__c = assignmentId, Treatment_Type__c = treatmentType)
            : existing[0];
        a.Response_JSON__c = responseJson;
        a.Status__c = status;
        if (stampSubmitted) a.Submitted_Date__c = Datetime.now();
        upsert a;
        return a.Id;
    }
}
