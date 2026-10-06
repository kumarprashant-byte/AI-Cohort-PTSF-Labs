@IsTest
private class PhiBlockoutStandardReportTest {

    @TestSetup
    static void setup() {
        Contact patient = new Contact(LastName = 'StdReportPatient', FirstName = 'Test');
        insert patient;
        insert new Medical_History__c(Patient__c = patient.Id, Diagnosis__c = 'StdRpt-dx', Encounter_Date__c = Date.today());
    }

    @IsTest static void systemAdministratorCannotReadMedicalHistoryViaStandardReportQuery() { assertDenial('System Administrator'); }
    @IsTest static void assessorCannotReadMedicalHistoryViaStandardReportQuery() { assertDenial('Assessor'); }
    @IsTest static void teamManagerCannotReadMedicalHistoryViaStandardReportQuery() { assertDenial('Team Manager'); }
    @IsTest static void regionalOpsManagerCannotReadMedicalHistoryViaStandardReportQuery() { assertDenial('Regional Ops Manager'); }
    @IsTest static void standardUserCannotReadMedicalHistoryViaStandardReportQuery() { assertDenial('Standard User'); }

    private static void assertDenial(String profileName) {
        User u = PhiBlockoutTestFactory.denyUserFor(profileName);
        Integer rowsSeen;
        System.runAs(u) {
            rowsSeen = [SELECT COUNT() FROM Medical_History__c WHERE Encounter_Date__c = LAST_N_DAYS:30];
        }
        System.assertEquals(0, rowsSeen, 'PHI blockout breach: "' + profileName + '" saw ' + rowsSeen + ' Medical_History__c rows via standard-report-shape SOQL.');
    }
}
