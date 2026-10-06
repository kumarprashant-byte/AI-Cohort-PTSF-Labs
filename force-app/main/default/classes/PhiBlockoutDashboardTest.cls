@IsTest
private class PhiBlockoutDashboardTest {

    @TestSetup
    static void setup() {
        Contact patient = new Contact(LastName = 'DashboardPatient', FirstName = 'Test');
        insert patient;
        insert new Medical_History__c(Patient__c = patient.Id, Diagnosis__c = 'Dash-dx');
    }

    @IsTest static void systemAdministratorCannotReadMedicalHistoryViaDashboardQuery() { assertDenial('System Administrator'); }
    @IsTest static void assessorCannotReadMedicalHistoryViaDashboardQuery() { assertDenial('Assessor'); }
    @IsTest static void teamManagerCannotReadMedicalHistoryViaDashboardQuery() { assertDenial('Team Manager'); }
    @IsTest static void regionalOpsManagerCannotReadMedicalHistoryViaDashboardQuery() { assertDenial('Regional Ops Manager'); }
    @IsTest static void standardUserCannotReadMedicalHistoryViaDashboardQuery() { assertDenial('Standard User'); }

    private static void assertDenial(String profileName) {
        User u = PhiBlockoutTestFactory.denyUserFor(profileName);
        Integer countSeen;
        System.runAs(u) {
            AggregateResult[] agg = [SELECT COUNT(Id) total FROM Medical_History__c];
            countSeen = agg.isEmpty() ? 0 : (Integer) agg[0].get('total');
        }
        System.assertEquals(0, countSeen, 'PHI blockout breach: "' + profileName + '" saw ' + countSeen + ' Medical_History__c rows via dashboard-shape aggregate query.');
    }
}
