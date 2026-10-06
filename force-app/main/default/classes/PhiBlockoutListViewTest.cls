@IsTest
private class PhiBlockoutListViewTest {

    @TestSetup
    static void setup() {
        Contact patient = new Contact(LastName = 'ListViewPatient', FirstName = 'Test');
        insert patient;
        insert new List<Medical_History__c>{
            new Medical_History__c(Patient__c = patient.Id, Diagnosis__c = 'LV-dx-1'),
            new Medical_History__c(Patient__c = patient.Id, Diagnosis__c = 'LV-dx-2')
        };
    }

    @IsTest static void systemAdministratorCannotReadMedicalHistoryViaListView() { assertDenial('System Administrator'); }
    @IsTest static void assessorCannotReadMedicalHistoryViaListView() { assertDenial('Assessor'); }
    @IsTest static void teamManagerCannotReadMedicalHistoryViaListView() { assertDenial('Team Manager'); }
    @IsTest static void regionalOpsManagerCannotReadMedicalHistoryViaListView() { assertDenial('Regional Ops Manager'); }
    @IsTest static void standardUserCannotReadMedicalHistoryViaListView() { assertDenial('Standard User'); }

    private static void assertDenial(String profileName) {
        User u = PhiBlockoutTestFactory.denyUserFor(profileName);
        Integer rowsSeen;
        System.runAs(u) {
            rowsSeen = [SELECT COUNT() FROM Medical_History__c LIMIT 1000];
        }
        System.assertEquals(0, rowsSeen, 'PHI blockout breach: "' + profileName + '" saw ' + rowsSeen + ' Medical_History__c rows via list-view SOQL.');
    }
}
