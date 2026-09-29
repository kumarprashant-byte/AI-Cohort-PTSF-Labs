@IsTest
private class AssignmentShareServiceTest {

    @TestSetup
    static void setup() {
        Contact patient = new Contact(LastName = 'Patient', FirstName = 'Test');
        insert patient;
        Contact practitioner = new Contact(LastName = 'Practitioner', FirstName = 'Test');
        insert practitioner;

        Medical_History__c mh1 = new Medical_History__c(Patient__c = patient.Id, Diagnosis__c = 'Test dx 1');
        Medical_History__c mh2 = new Medical_History__c(Patient__c = patient.Id, Diagnosis__c = 'Test dx 2');
        insert new List<Medical_History__c>{ mh1, mh2 };

        Subsidy_Application__c app = new Subsidy_Application__c(Patient__c = patient.Id, Status__c = 'Awaiting_Practitioner');
        insert app;

        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        String uniq = String.valueOf(DateTime.now().getTime());
        User practitionerUser = new User(
            Alias = 'assh' + uniq.right(4),
            Email = 'assh' + uniq + '@ptsf.test',
            EmailEncodingKey = 'UTF-8',
            LastName = 'PracUser',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/New_York',
            Username = 'assh' + uniq + '@ptsf.test.invalid'
        );
        insert practitionerUser;

        Assignment__c asn = new Assignment__c(
            Application__c = app.Id,
            OwnerId = practitionerUser.Id,
            Status__c = 'Assigned',
            Practitioner_Contact__c = practitioner.Id
        );
        insert asn;
    }

    @IsTest
    static void acceptGrantsShares() {
        Assignment__c a = [SELECT Id, Status__c, OwnerId FROM Assignment__c LIMIT 1];

        Test.startTest();
        a.Status__c = 'Accepted';
        update a;
        Test.stopTest();

        List<Medical_History__Share> shares = [
            SELECT Id, ParentId, UserOrGroupId, AccessLevel, RowCause
            FROM Medical_History__Share
            WHERE UserOrGroupId = :a.OwnerId AND RowCause = 'Manual'
        ];
        System.assertEquals(2, shares.size(), 'Two shares expected (2 medical histories for the patient)');
        for (Medical_History__Share s : shares) System.assertEquals('Read', s.AccessLevel);

        Integer auditCount = [SELECT COUNT() FROM Audit_Log__c WHERE Action__c = 'Manual_Share_Insert' AND User__c = :a.OwnerId];
        System.assertEquals(2, auditCount, 'Two audit rows expected');
    }

    @IsTest
    static void declineRevokesShares() {
        Assignment__c a = [SELECT Id, Status__c, OwnerId FROM Assignment__c LIMIT 1];
        a.Status__c = 'Accepted';
        update a;

        Test.startTest();
        a.Status__c = 'Declined';
        update a;
        Test.stopTest();

        Integer shareCount = [
            SELECT COUNT()
            FROM Medical_History__Share
            WHERE UserOrGroupId = :a.OwnerId AND RowCause = 'Manual'
        ];
        System.assertEquals(0, shareCount, 'All manual shares should be revoked');

        Integer auditCount = [SELECT COUNT() FROM Audit_Log__c WHERE Action__c = 'Manual_Share_Delete' AND User__c = :a.OwnerId];
        System.assertEquals(2, auditCount, 'Two revoke audit rows expected');
    }

    @IsTest
    static void grantIsIdempotent() {
        Assignment__c a = [SELECT Id, Status__c, OwnerId, Application__c FROM Assignment__c LIMIT 1];
        a.Status__c = 'Accepted';
        update a;

        Test.startTest();
        Assignment__c requeried = [SELECT Id, OwnerId, Application__c FROM Assignment__c WHERE Id = :a.Id];
        AssignmentShareService.grantForAssignments(new List<Assignment__c>{ requeried });
        Test.stopTest();

        Integer shareCount = [
            SELECT COUNT()
            FROM Medical_History__Share
            WHERE UserOrGroupId = :a.OwnerId AND RowCause = 'Manual'
        ];
        System.assertEquals(2, shareCount, 'Re-grant must not duplicate shares');
    }
}
