@IsTest
private class PhiBlockoutRecordPageTest {

    @TestSetup
    static void setup() {
        Contact patient = new Contact(LastName = 'BlockoutPatient', FirstName = 'Test');
        insert patient;
        insert new Medical_History__c(Patient__c = patient.Id, Diagnosis__c = 'Confidential-dx');
    }

    @IsTest
    static void systemAdministratorCannotReadMedicalHistoryViaSoql() {
        assertDenialForProfile('System Administrator');
    }

    @IsTest
    static void assessorCannotReadMedicalHistoryViaSoql() {
        assertDenialForProfile('Assessor');
    }

    @IsTest
    static void teamManagerCannotReadMedicalHistoryViaSoql() {
        assertDenialForProfile('Team Manager');
    }

    @IsTest
    static void regionalOpsManagerCannotReadMedicalHistoryViaSoql() {
        assertDenialForProfile('Regional Ops Manager');
    }

    @IsTest
    static void standardUserCannotReadMedicalHistoryViaSoql() {
        assertDenialForProfile('Standard User');
    }

    private static void assertDenialForProfile(String profileName) {
        User u = PhiBlockoutTestFactory.denyUserFor(profileName);
        Integer rowsSeen;
        System.runAs(u) {
            rowsSeen = [SELECT COUNT() FROM Medical_History__c];
        }
        System.assertEquals(
            0,
            rowsSeen,
            'PHI blockout breach: profile "' + profileName + '" saw ' + rowsSeen + ' Medical_History__c row(s) via record-page SOQL. If this intent is correct, INT-004 is wrong — do not loosen this test.'
        );
    }
}
