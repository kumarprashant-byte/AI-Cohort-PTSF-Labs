@IsTest(SeeAllData=false)
private class AssessorSubsidyControllerTest {

    private static Subsidy_Determination_Rule__c seedRule(String region, String transportType,
                                                           Decimal minKm, Decimal maxKm,
                                                           Decimal baseAmt, Decimal mult) {
        Subsidy_Determination_Rule__c r = new Subsidy_Determination_Rule__c(
            Name = region + '-' + transportType + '-' + String.valueOf(minKm),
            Region__c = region,
            Transport_Type__c = transportType,
            Distance_Min_Km__c = minKm,
            Distance_Max_Km__c = maxKm,
            Base_Amount__c = baseAmt,
            Multiplier__c = mult
        );
        insert r;
        return r;
    }

    private static Subsidy_Application__c seedApplication(String region, String transport, Decimal distanceKm) {
        Contact patient = new Contact(LastName = 'Test Patient');
        insert patient;
        Subsidy_Application__c app = new Subsidy_Application__c(
            Patient__c = patient.Id,
            Region__c = region,
            Transport_Type__c = transport,
            Distance_Km__c = distanceKm,
            Status__c = 'Draft'
        );
        insert app;
        return app;
    }

    @IsTest
    static void recalculateEmeaRoad180km() {
        seedRule('EMEA', 'Road', 100, 300, 1000, 1.2);
        Subsidy_Application__c app = seedApplication('EMEA', 'Road', 180);

        Test.startTest();
        AssessorSubsidyController.CalculationResult result = AssessorSubsidyController.recalculate(app.Id);
        Test.stopTest();

        System.assertEquals(180, result.distanceKm, 'distanceKm should echo application');
        System.assertEquals(1200, result.proposedAmount, 'base 1000 × mult 1.2 = 1200');
        System.assertNotEquals(null, result.ruleName, 'ruleName populated');
    }

    @IsTest
    static void recalculateEmeaAir180km() {
        seedRule('EMEA', 'Air', 100, 300, 1500, 1.6);
        Subsidy_Application__c app = seedApplication('EMEA', 'Air', 180);

        AssessorSubsidyController.CalculationResult result = AssessorSubsidyController.recalculate(app.Id);

        System.assertEquals(2400, result.proposedAmount, 'base 1500 × mult 1.6 = 2400');
    }

    @IsTest
    static void recalculateDoesNotPersist() {
        seedRule('EMEA', 'Road', 100, 300, 1000, 1.2);
        Subsidy_Application__c app = seedApplication('EMEA', 'Road', 180);
        app.Proposed_Amount__c = 999;
        update app;

        AssessorSubsidyController.recalculate(app.Id);

        Subsidy_Application__c reread = [SELECT Proposed_Amount__c FROM Subsidy_Application__c WHERE Id = :app.Id];
        System.assertEquals(999, reread.Proposed_Amount__c, 'recalculate must not persist to the record');
    }

    @IsTest
    static void recalculateThrowsOnMissingRule() {
        Subsidy_Application__c app = seedApplication('APAC', 'Sea', 500);

        Boolean threw = false;
        try {
            AssessorSubsidyController.recalculate(app.Id);
        } catch (AuraHandledException e) {
            threw = true;
        }
        System.assertEquals(true, threw, 'Missing rule row must raise');
    }

    @IsTest
    static void overrideReasonRequiredOnDivergence() {
        Subsidy_Application__c app = seedApplication('EMEA', 'Road', 180);
        app.Proposed_Amount__c = 1200;
        app.Approved_Amount__c = 2400;
        app.Adjustment_Reason__c = null;

        Boolean threw = false;
        try {
            update app;
        } catch (DmlException e) {
            threw = e.getMessage().contains('Adjustment Reason is required');
        }
        System.assertEquals(true, threw, 'Validation rule must fire on divergence without a reason');
    }

    @IsTest
    static void calculatorPathNoOverride() {
        Subsidy_Application__c app = seedApplication('EMEA', 'Road', 180);
        app.Proposed_Amount__c = 1200;
        app.Approved_Amount__c = 1200;
        update app;

        Subsidy_Application__c reread = [SELECT Decision_Source__c FROM Subsidy_Application__c WHERE Id = :app.Id];
        System.assertEquals('calculator', reread.Decision_Source__c,
            'Decision_Source should be calculator when amounts match');
    }

    @IsTest
    static void decisionSourceReadsManualOnDivergence() {
        Subsidy_Application__c app = seedApplication('EMEA', 'Road', 180);
        app.Proposed_Amount__c = 1200;
        app.Approved_Amount__c = 2400;
        app.Adjustment_Reason__c = 'clinical necessity';
        update app;

        Subsidy_Application__c reread = [SELECT Decision_Source__c FROM Subsidy_Application__c WHERE Id = :app.Id];
        System.assertEquals('manual', reread.Decision_Source__c,
            'Decision_Source should be manual when amounts diverge');
    }

    @IsTest
    static void recalculateRejectsBlankId() {
        Boolean threw = false;
        try {
            AssessorSubsidyController.recalculate(null);
        } catch (AuraHandledException e) {
            threw = true;
        }
        System.assertEquals(true, threw, 'null id must raise');
    }
}
