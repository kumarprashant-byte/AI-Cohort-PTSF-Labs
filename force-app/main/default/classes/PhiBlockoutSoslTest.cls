@IsTest
private class PhiBlockoutSoslTest {

    @TestSetup
    static void setup() {
        Contact patient = new Contact(LastName = 'SoslPatient', FirstName = 'Test');
        insert patient;
        insert new Medical_History__c(Patient__c = patient.Id, Diagnosis__c = 'FindMeDx');
    }

    @IsTest static void systemAdministratorCannotFindMedicalHistoryViaSosl() { assertDenial('System Administrator'); }
    @IsTest static void assessorCannotFindMedicalHistoryViaSosl() { assertDenial('Assessor'); }
    @IsTest static void teamManagerCannotFindMedicalHistoryViaSosl() { assertDenial('Team Manager'); }
    @IsTest static void regionalOpsManagerCannotFindMedicalHistoryViaSosl() { assertDenial('Regional Ops Manager'); }
    @IsTest static void standardUserCannotFindMedicalHistoryViaSosl() { assertDenial('Standard User'); }

    private static void assertDenial(String profileName) {
        User u = PhiBlockoutTestFactory.denyUserFor(profileName);
        Integer rowsSeen;
        System.runAs(u) {
            Test.setFixedSearchResults(new List<Id>());
            List<List<SObject>> results = [FIND 'FindMeDx' IN ALL FIELDS RETURNING Medical_History__c(Id)];
            rowsSeen = results.isEmpty() ? 0 : results[0].size();
        }
        System.assertEquals(0, rowsSeen, 'PHI blockout breach: "' + profileName + '" saw ' + rowsSeen + ' Medical_History__c rows via SOSL global search.');
    }
}
