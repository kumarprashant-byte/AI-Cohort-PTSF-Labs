@IsTest
private class PhiBlockoutCustomReportTest {

    @TestSetup
    static void setup() {
        Contact patient = new Contact(LastName = 'CustomReportPatient', FirstName = 'Test');
        insert patient;
        insert new Medical_History__c(Patient__c = patient.Id, Diagnosis__c = 'CustomRpt-dx', Diagnosis_Code__c = 'ICD-TEST');
    }

    @IsTest static void systemAdministratorCannotReadMedicalHistoryViaCustomReportQuery() { assertDenial('System Administrator'); }
    @IsTest static void assessorCannotReadMedicalHistoryViaCustomReportQuery() { assertDenial('Assessor'); }
    @IsTest static void teamManagerCannotReadMedicalHistoryViaCustomReportQuery() { assertDenial('Team Manager'); }
    @IsTest static void regionalOpsManagerCannotReadMedicalHistoryViaCustomReportQuery() { assertDenial('Regional Ops Manager'); }
    @IsTest static void standardUserCannotReadMedicalHistoryViaCustomReportQuery() { assertDenial('Standard User'); }

    private static void assertDenial(String profileName) {
        User u = PhiBlockoutTestFactory.denyUserFor(profileName);
        Integer rowsSeen;
        System.runAs(u) {
            rowsSeen = [SELECT COUNT() FROM Medical_History__c WHERE Diagnosis_Code__c != NULL];
        }
        System.assertEquals(0, rowsSeen, 'PHI blockout breach: "' + profileName + '" saw ' + rowsSeen + ' Medical_History__c rows via custom-report-shape SOQL.');
    }
}
