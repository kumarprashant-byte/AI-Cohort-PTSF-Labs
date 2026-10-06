@IsTest
private class PhiBlockoutRelatedListTest {

    @TestSetup
    static void setup() {
        Contact patient = new Contact(LastName = 'RelatedListPatient', FirstName = 'Test');
        insert patient;
        insert new Medical_History__c(Patient__c = patient.Id, Diagnosis__c = 'Related-dx');
    }

    @IsTest static void systemAdministratorCannotReadMedicalHistoryViaRelatedList() { assertDenial('System Administrator'); }
    @IsTest static void assessorCannotReadMedicalHistoryViaRelatedList() { assertDenial('Assessor'); }
    @IsTest static void teamManagerCannotReadMedicalHistoryViaRelatedList() { assertDenial('Team Manager'); }
    @IsTest static void regionalOpsManagerCannotReadMedicalHistoryViaRelatedList() { assertDenial('Regional Ops Manager'); }
    @IsTest static void standardUserCannotReadMedicalHistoryViaRelatedList() { assertDenial('Standard User'); }

    private static void assertDenial(String profileName) {
        User u = PhiBlockoutTestFactory.denyUserFor(profileName);
        Integer rowsSeen;
        System.runAs(u) {
            List<Contact> parents = [SELECT Id, (SELECT Id FROM Medical_Histories__r) FROM Contact LIMIT 50];
            Integer count = 0;
            for (Contact c : parents) count += c.getSObjects('Medical_Histories__r') == null ? 0 : c.getSObjects('Medical_Histories__r').size();
            rowsSeen = count;
        }
        System.assertEquals(0, rowsSeen, 'PHI blockout breach: "' + profileName + '" saw ' + rowsSeen + ' child Medical_History__c via Contact related list.');
    }
}
