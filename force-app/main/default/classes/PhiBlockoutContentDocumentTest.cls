@IsTest
private class PhiBlockoutContentDocumentTest {

    @TestSetup
    static void setup() {
        Contact patient = new Contact(LastName = 'ContentDocPatient', FirstName = 'Test');
        insert patient;
        Medical_History__c mh = new Medical_History__c(Patient__c = patient.Id, Diagnosis__c = 'ContentDocDx');
        insert mh;

        ContentVersion cv = new ContentVersion(
            Title = 'phi-attachment',
            PathOnClient = 'phi.txt',
            VersionData = Blob.valueOf('sensitive-attachment-contents')
        );
        insert cv;

        Id docId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1].ContentDocumentId;
        insert new ContentDocumentLink(
            LinkedEntityId = mh.Id,
            ContentDocumentId = docId,
            ShareType = 'V'
        );
    }

    @IsTest static void systemAdministratorCannotReachMedicalHistoryAttachmentsViaContentDocumentLink() { assertDenial('System Administrator'); }
    @IsTest static void assessorCannotReachMedicalHistoryAttachmentsViaContentDocumentLink() { assertDenial('Assessor'); }
    @IsTest static void teamManagerCannotReachMedicalHistoryAttachmentsViaContentDocumentLink() { assertDenial('Team Manager'); }
    @IsTest static void regionalOpsManagerCannotReachMedicalHistoryAttachmentsViaContentDocumentLink() { assertDenial('Regional Ops Manager'); }
    @IsTest static void standardUserCannotReachMedicalHistoryAttachmentsViaContentDocumentLink() { assertDenial('Standard User'); }

    private static void assertDenial(String profileName) {
        User u = PhiBlockoutTestFactory.denyUserFor(profileName);
        Integer rowsSeen;
        System.runAs(u) {
            rowsSeen = [
                SELECT COUNT()
                FROM ContentDocumentLink
                WHERE LinkedEntityId IN (SELECT Id FROM Medical_History__c)
            ];
        }
        System.assertEquals(0, rowsSeen, 'PHI blockout breach: "' + profileName + '" reached ' + rowsSeen + ' ContentDocumentLink row(s) attached to Medical_History__c.');
    }
}
