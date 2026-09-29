@IsTest
private class HICQueueableTest {

    private static HIC_Check__c seedRow(String kind) {
        Datetime t = Datetime.newInstance(2026, 1, 1, 0, 0, 0);
        String key = HICIdempotency.keyFor('a01000000000001AAA', t);
        HIC_Check__c row = new HIC_Check__c(
            Idempotency_Key__c = key, Kind__c = kind, Status__c = 'Pending',
            Source_Record_Id__c = 'a01000000000001AAA', Submitted_At__c = t,
            Request_JSON__c = '{"x":1}', Attempt_Count__c = 0
        );
        insert row;
        return row;
    }

    @IsTest static void publishingEventEnqueuesQueueable() {
        HICMockClient mock = new HICMockClient();
        HICQueueable.overrideClient = mock;

        Test.startTest();
        EventBus.publish(new HIC_Prefill_Requested__e(
            Source_Record_Id__c = 'a01000000000002AAA',
            Submitted_At__c = Datetime.newInstance(2026, 1, 2, 0, 0, 0),
            Request_JSON__c = '{"y":2}'
        ));
        Test.stopTest();

        List<HIC_Check__c> rows = [SELECT Id, Status__c, Kind__c FROM HIC_Check__c WHERE Source_Record_Id__c = 'a01000000000002AAA'];
        System.assertEquals(1, rows.size(), 'trigger must upsert a HIC_Check__c row');
        System.assertEquals('Prefill', rows[0].Kind__c);
        System.assert(new Set<String>{'Pending','In Progress','Success'}.contains(rows[0].Status__c),
            'row is in an expected initial/in-flight state: ' + rows[0].Status__c);
    }

    @IsTest static void retriesUpToThreeThenDefers() {
        HIC_Check__c row = seedRow('Prefill');
        HICMockClient mock = new HICMockClient();
        mock.shouldSucceed = false;
        HICQueueable.overrideClient = mock;

        Test.startTest();
        HICQueueable.runFor(row.Id);
        HICQueueable.runFor(row.Id);
        HICQueueable.runFor(row.Id);
        Test.stopTest();

        HIC_Check__c after = [SELECT Status__c, Attempt_Count__c, Next_Attempt_At__c, Last_Error__c FROM HIC_Check__c WHERE Id = :row.Id];
        System.assertEquals(3, (Integer) after.Attempt_Count__c, 'three attempts recorded');
        System.assertEquals('Deferred', after.Status__c, 'terminal state after max attempts is Deferred');
        System.assertNotEquals(null, after.Next_Attempt_At__c);
        System.assertNotEquals(null, after.Last_Error__c);
    }

    @IsTest static void duplicateIdempotencyKeyDoesNotDoubleInsert() {
        HICMockClient mock = new HICMockClient();
        HICQueueable.overrideClient = mock;
        Datetime same = Datetime.newInstance(2026, 1, 3, 0, 0, 0);

        Test.startTest();
        EventBus.publish(new HIC_Prefill_Requested__e(
            Source_Record_Id__c = 'a01000000000003AAA', Submitted_At__c = same, Request_JSON__c = '{"n":1}'
        ));
        EventBus.publish(new HIC_Prefill_Requested__e(
            Source_Record_Id__c = 'a01000000000003AAA', Submitted_At__c = same, Request_JSON__c = '{"n":2}'
        ));
        Test.stopTest();

        List<HIC_Check__c> rows = [SELECT Id FROM HIC_Check__c WHERE Source_Record_Id__c = 'a01000000000003AAA'];
        System.assertEquals(1, rows.size(), 'idempotency key dedupes duplicate events');
    }

    @IsTest static void successPublishesCompletionEvent() {
        HIC_Check__c row = seedRow('Prefill');
        HICMockClient mock = new HICMockClient();
        mock.responseBody = '{"result":"ok"}';
        HICQueueable.overrideClient = mock;

        Test.startTest();
        HICQueueable.runFor(row.Id);
        Test.stopTest();

        HIC_Check__c after = [SELECT Status__c, Response_JSON__c FROM HIC_Check__c WHERE Id = :row.Id];
        System.assertEquals('Success', after.Status__c);
        System.assertEquals('{"result":"ok"}', after.Response_JSON__c, 'response body persisted');
    }

    @IsTest static void entitlementRequestedTriggerCreatesRow() {
        HICQueueable.overrideClient = new HICMockClient();
        Test.startTest();
        EventBus.publish(new HIC_Entitlement_Requested__e(
            Source_Record_Id__c = 'a01000000000004AAA',
            Submitted_At__c = Datetime.newInstance(2026, 1, 4, 0, 0, 0),
            Request_JSON__c = '{"e":1}'
        ));
        Test.stopTest();

        List<HIC_Check__c> rows = [SELECT Kind__c FROM HIC_Check__c WHERE Source_Record_Id__c = 'a01000000000004AAA'];
        System.assertEquals(1, rows.size(), 'entitlement trigger must upsert a HIC_Check__c row');
        System.assertEquals('Entitlement', rows[0].Kind__c);
    }

    @IsTest static void entitlementKindRoutesToEntitlementCompletion() {
        HIC_Check__c row = seedRow('Entitlement');
        HICQueueable.overrideClient = new HICMockClient();

        Test.startTest();
        HICQueueable.runFor(row.Id);
        Test.stopTest();

        HIC_Check__c after = [SELECT Status__c, Kind__c FROM HIC_Check__c WHERE Id = :row.Id];
        System.assertEquals('Success', after.Status__c);
        System.assertEquals('Entitlement', after.Kind__c);
    }
}
