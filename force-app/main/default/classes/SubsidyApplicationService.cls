public with sharing class SubsidyApplicationService {

    public class ServiceException extends Exception {}

    @AuraEnabled(cacheable=true)
    public static Subsidy_Application__c getApplication(Id appId) {
        return [
            SELECT Id, Name, Status__c, Patient__c, Patient__r.Name,
                   Approved_Amount__c, Rejection_Reason__c, Proposed_Amount__c,
                   Submitted_At__c, Region__c, Transport_Type__c
            FROM Subsidy_Application__c
            WHERE Id = :appId
            LIMIT 1
        ];
    }

    @AuraEnabled
    public static Subsidy_Application__c submit(Id appId) {
        Subsidy_Application__c app = loadForWrite(appId);
        if (app.Status__c != 'Draft') {
            throw new AuraHandledException('Can only submit a Draft application (current: ' + app.Status__c + ')');
        }
        app.Status__c = 'Submitted';
        app.Submitted_At__c = Datetime.now();
        update app;
        return getApplication(appId);
    }

    @AuraEnabled
    public static Subsidy_Application__c approve(Id appId, Decimal approvedAmount) {
        if (approvedAmount == null || approvedAmount <= 0) {
            throw new AuraHandledException('Approved amount must be greater than zero');
        }
        Subsidy_Application__c app = loadForWrite(appId);
        if (!isApprovableFrom(app.Status__c)) {
            throw new AuraHandledException('Cannot approve from status ' + app.Status__c);
        }
        app.Status__c = 'Approved';
        app.Approved_Amount__c = approvedAmount;
        update app;
        return getApplication(appId);
    }

    @AuraEnabled
    public static Subsidy_Application__c reject(Id appId, String reason) {
        if (String.isBlank(reason)) {
            throw new AuraHandledException('Rejection reason is required');
        }
        Subsidy_Application__c app = loadForWrite(appId);
        if (!isApprovableFrom(app.Status__c)) {
            throw new AuraHandledException('Cannot reject from status ' + app.Status__c);
        }
        app.Status__c = 'Rejected';
        app.Rejection_Reason__c = reason;
        update app;
        return getApplication(appId);
    }

    @AuraEnabled
    public static Assignment__c assignPractitioner(Id appId, Id practitionerContactId) {
        if (practitionerContactId == null) {
            throw new AuraHandledException('Practitioner is required');
        }
        Subsidy_Application__c app = loadForWrite(appId);
        List<Assignment__c> openOnes = [
            SELECT Id, Status__c, Practitioner_Contact__c, Assigned_Date__c
            FROM Assignment__c
            WHERE Application__c = :appId AND Status__c IN ('Assigned','Accepted','In_Progress')
            LIMIT 1
        ];
        if (!openOnes.isEmpty()) {
            return openOnes[0];
        }
        if (app.Status__c != 'Approved' && app.Status__c != 'Awaiting_Practitioner') {
            throw new AuraHandledException('Application must be Approved before assigning (current: ' + app.Status__c + ')');
        }
        Assignment__c a = new Assignment__c(
            Application__c = appId,
            Practitioner_Contact__c = practitionerContactId,
            Status__c = 'Assigned',
            Assigned_Date__c = Date.today(),
            Region__c = app.Region__c
        );
        insert a;
        app.Status__c = 'Assigned';
        update app;
        return a;
    }

    @AuraEnabled(cacheable=true)
    public static List<Contact> listPractitioners() {
        return [
            SELECT Id, Name, Region__c
            FROM Contact
            WHERE RecordType.DeveloperName = 'Practitioner'
            ORDER BY Name
            LIMIT 200
        ];
    }

    private static Subsidy_Application__c loadForWrite(Id appId) {
        List<Subsidy_Application__c> rows = [
            SELECT Id, Status__c, Submitted_At__c, Approved_Amount__c, Rejection_Reason__c, Region__c
            FROM Subsidy_Application__c
            WHERE Id = :appId
            LIMIT 1
            FOR UPDATE
        ];
        if (rows.isEmpty()) throw new AuraHandledException('Application not found');
        return rows[0];
    }

    private static Boolean isApprovableFrom(String status) {
        return status == 'Submitted'
            || status == 'Awaiting_Insurance_Check'
            || status == 'Assessment';
    }
}
