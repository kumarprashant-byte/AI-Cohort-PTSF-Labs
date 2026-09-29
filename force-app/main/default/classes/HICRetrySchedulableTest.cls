@IsTest
private class HICRetrySchedulableTest {

    private static HIC_Check__c seedDeferred(Datetime nextAttempt) {
        Datetime t = Datetime.newInstance(2026, 1, 1, 0, 0, 0);
        HIC_Check__c row = new HIC_Check__c(
            Idempotency_Key__c = HICIdempotency.keyFor('a01000000000020AAA', t),
            Kind__c = 'Prefill', Status__c = 'Deferred',
            Source_Record_Id__c = 'a01000000000020AAA', Submitted_At__c = t,
            Request_JSON__c = '{}', Attempt_Count__c = 1,
            Next_Attempt_At__c = nextAttempt
        );
        insert row;
        return row;
    }

    @IsTest static void deferredRowIsRequeuedWhenDue() {
        HIC_Check__c row = seedDeferred(Datetime.now().addMinutes(-1));
        HICQueueable.overrideClient = new HICMockClient();

        Test.startTest();
        HICRetrySchedulable.runNow();
        Test.stopTest();

        HIC_Check__c after = [SELECT Status__c, Attempt_Count__c FROM HIC_Check__c WHERE Id = :row.Id];
        System.assertEquals('Success', after.Status__c, 'schedulable re-enqueued and mock succeeded');
        System.assertEquals(2, (Integer) after.Attempt_Count__c, 'attempt count advanced');
    }

    @IsTest static void rowNotDueIsIgnored() {
        HIC_Check__c row = seedDeferred(Datetime.now().addMinutes(30));
        HICQueueable.overrideClient = new HICMockClient();

        Test.startTest();
        HICRetrySchedulable.runNow();
        Test.stopTest();

        HIC_Check__c after = [SELECT Status__c, Attempt_Count__c FROM HIC_Check__c WHERE Id = :row.Id];
        System.assertEquals('Deferred', after.Status__c, 'future-due row is left alone');
        System.assertEquals(1, (Integer) after.Attempt_Count__c);
    }

    @IsTest static void rowsOlderThan24HoursAreIgnored() {
        HIC_Check__c row = seedDeferred(Datetime.now().addMinutes(-1));
        Test.setCreatedDate(row.Id, Datetime.now().addHours(-25));
        HICQueueable.overrideClient = new HICMockClient();

        Test.startTest();
        HICRetrySchedulable.runNow();
        Test.stopTest();

        HIC_Check__c after = [SELECT Status__c FROM HIC_Check__c WHERE Id = :row.Id];
        System.assertEquals('Deferred', after.Status__c, 'row past 24h horizon must be skipped');
    }
}
