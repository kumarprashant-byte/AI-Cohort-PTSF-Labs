@IsTest
private class SubsidyApplicationServiceTest {

    private static Subsidy_Application__c mkApp() {
        Account acc = new Account(Name='T Household');
        insert acc;
        Contact c = new Contact(FirstName='Pat', LastName='Patient', Email='p'+System.currentTimeMillis()+'@x.com', AccountId=acc.Id);
        insert c;
        Subsidy_Application__c a = new Subsidy_Application__c(
            Patient__c = c.Id,
            Status__c = 'Draft',
            Proposed_Amount__c = 500,
            Region__c = 'EMEA',
            Transport_Type__c = 'Air'
        );
        insert a;
        return a;
    }

    private static Contact mkPractitioner() {
        Id rtId = [SELECT Id FROM RecordType WHERE SobjectType='Contact' AND DeveloperName='Practitioner' LIMIT 1].Id;
        Contact p = new Contact(FirstName='Dr', LastName='Who'+System.currentTimeMillis(), RecordTypeId=rtId, Region__c='EMEA');
        insert p;
        return p;
    }

    @IsTest static void submitFlipsStatus() {
        Subsidy_Application__c a = mkApp();
        Subsidy_Application__c after = SubsidyApplicationService.submit(a.Id);
        System.assertNotEquals('Draft', after.Status__c, 'submit should move status off Draft');
        System.assertNotEquals(null, after.Submitted_At__c);
    }

    @IsTest static void submitRejectsNonDraft() {
        Subsidy_Application__c a = mkApp();
        SubsidyApplicationService.submit(a.Id);
        try {
            SubsidyApplicationService.submit(a.Id);
            System.assert(false, 'should have thrown');
        } catch (AuraHandledException e) { System.assert(true); }
    }

    @IsTest static void approveRequiresAmount() {
        Subsidy_Application__c a = mkApp();
        SubsidyApplicationService.submit(a.Id);
        try {
            SubsidyApplicationService.approve(a.Id, null);
            System.assert(false, 'should have thrown');
        } catch (AuraHandledException e) { System.assert(true); }
    }

    @IsTest static void approveHappyPath() {
        Subsidy_Application__c a = mkApp();
        SubsidyApplicationService.submit(a.Id);
        Subsidy_Application__c after = SubsidyApplicationService.approve(a.Id, 450);
        System.assertEquals('Approved', after.Status__c);
        System.assertEquals(450, after.Approved_Amount__c);
    }

    @IsTest static void rejectRequiresReason() {
        Subsidy_Application__c a = mkApp();
        SubsidyApplicationService.submit(a.Id);
        try {
            SubsidyApplicationService.reject(a.Id, '  ');
            System.assert(false, 'should have thrown');
        } catch (AuraHandledException e) { System.assert(true); }
    }

    @IsTest static void rejectHappyPath() {
        Subsidy_Application__c a = mkApp();
        SubsidyApplicationService.submit(a.Id);
        Subsidy_Application__c after = SubsidyApplicationService.reject(a.Id, 'Documentation incomplete');
        System.assertEquals('Rejected', after.Status__c);
        System.assertEquals('Documentation incomplete', after.Rejection_Reason__c);
    }

    @IsTest static void approveFromRejectedThrows() {
        Subsidy_Application__c a = mkApp();
        SubsidyApplicationService.submit(a.Id);
        SubsidyApplicationService.reject(a.Id, 'nope');
        try {
            SubsidyApplicationService.approve(a.Id, 100);
            System.assert(false, 'should have thrown');
        } catch (AuraHandledException e) { System.assert(true); }
    }

    @IsTest static void assignPractitionerCreatesAssignmentAndFlipsApp() {
        Subsidy_Application__c a = mkApp();
        SubsidyApplicationService.submit(a.Id);
        SubsidyApplicationService.approve(a.Id, 200);
        Contact p = mkPractitioner();
        Assignment__c asn = SubsidyApplicationService.assignPractitioner(a.Id, p.Id);
        System.assertNotEquals(null, asn.Id);
        System.assertEquals('Assigned', asn.Status__c);
        Subsidy_Application__c after = [SELECT Status__c FROM Subsidy_Application__c WHERE Id=:a.Id];
        System.assertEquals('Assigned', after.Status__c);
    }

    @IsTest static void assignPractitionerIsIdempotent() {
        Subsidy_Application__c a = mkApp();
        SubsidyApplicationService.submit(a.Id);
        SubsidyApplicationService.approve(a.Id, 200);
        Contact p = mkPractitioner();
        Assignment__c first = SubsidyApplicationService.assignPractitioner(a.Id, p.Id);
        Assignment__c second = SubsidyApplicationService.assignPractitioner(a.Id, p.Id);
        System.assertEquals(first.Id, second.Id, 'second call must return same open assignment');
        Integer total = [SELECT COUNT() FROM Assignment__c WHERE Application__c=:a.Id];
        System.assertEquals(1, total);
    }

    @IsTest static void getApplicationReturnsRow() {
        Subsidy_Application__c a = mkApp();
        Subsidy_Application__c got = SubsidyApplicationService.getApplication(a.Id);
        System.assertEquals('Draft', got.Status__c);
    }

    @IsTest static void listPractitionersRuns() {
        mkPractitioner();
        List<Contact> ps = SubsidyApplicationService.listPractitioners();
        System.assert(ps.size() >= 1);
    }
}
