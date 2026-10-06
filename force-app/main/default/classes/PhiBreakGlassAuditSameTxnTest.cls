@IsTest
private class PhiBreakGlassAuditSameTxnTest {

    @TestSetup
    static void setup() {
        Contact patient = new Contact(LastName = 'BreakGlassPatient', FirstName = 'Test');
        insert patient;
        insert new Medical_History__c(Patient__c = patient.Id, Diagnosis__c = 'Audit-dx');
    }

    @IsTest
    static void testGrantAndReadWritesAuditInSameTransaction() {
        DateTime testStart = DateTime.now();
        User officer = PhiBlockoutTestFactory.complianceOfficerWithEmergencyAccess();

        Integer rowsSeen;
        Test.startTest();
        System.runAs(officer) {
            rowsSeen = [SELECT COUNT() FROM Medical_History__c];
        }
        Test.stopTest();

        System.assertEquals(
            1,
            rowsSeen,
            'Break-glass positive path broken: Compliance Officer with PHI_Emergency_Access saw ' + rowsSeen + ' rows instead of 1.'
        );

        List<Audit_Log__c> grants = [
            SELECT Id FROM Audit_Log__c
            WHERE Action__c = 'Break_Glass_Grant'
              AND User__c = :officer.Id
              AND Timestamp__c >= :testStart
        ];
        System.assertEquals(
            1,
            grants.size(),
            'Break-glass audit missing: PS grant did not produce exactly one Audit_Log__c row in the same transaction. ' +
            'Found ' + grants.size() + '. A read without the paired log is a test failure (INT-026 SC-3).'
        );
    }
}
