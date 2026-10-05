@IsTest
private class HICPrefillCalloutTest {

    private class MockOk implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"insurerName":"Acme","policyNumber":"POL-1","coverageTier":"Gold"}');
            return res;
        }
    }

    private class MockFail implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(500);
            res.setBody('{"error":"boom"}');
            return res;
        }
    }

    private static Onboarding__c mkOnboarding() {
        Contact c = new Contact(FirstName='T', LastName='Patient', Email='t'+System.currentTimeMillis()+'@x.com');
        insert c;
        Onboarding__c o = new Onboarding__c(Contact__c=c.Id, Step__c='Identity', Payload_JSON__c='{}');
        insert o;
        return o;
    }

    @IsTest static void successPathFlipsReceived() {
        Onboarding__c o = mkOnboarding();
        Test.setMock(HttpCalloutMock.class, new MockOk());
        Test.startTest();
        System.enqueueJob(new HICPrefillCallout(new List<HICPrefillCallout.Request>{
            new HICPrefillCallout.Request(o.Id, o.Contact__c, '{"policy":"POL-1"}')
        }));
        Test.stopTest();
        Onboarding__c after = [SELECT Prefill_Status__c, Prefill_Response_JSON__c FROM Onboarding__c WHERE Id=:o.Id];
        System.assertEquals('Received', after.Prefill_Status__c);
        System.assert(after.Prefill_Response_JSON__c.contains('Acme'));
        System.assertEquals(0, [SELECT COUNT() FROM Integration_Error__c WHERE Related_Record_Id__c=:o.Id]);
    }

    @IsTest static void handleEventsEnqueuesAndSkipsBlank() {
        Onboarding__c o = mkOnboarding();
        Test.setMock(HttpCalloutMock.class, new MockOk());
        List<HIC_Prefill_Requested__e> evts = new List<HIC_Prefill_Requested__e>{
            new HIC_Prefill_Requested__e(Contact_Id__c=o.Contact__c, Onboarding_Id__c=o.Id, Request_JSON__c='{"p":"1"}', Submitted_At__c=Datetime.now()),
            new HIC_Prefill_Requested__e(Contact_Id__c=o.Contact__c, Onboarding_Id__c=null, Request_JSON__c='{"p":"2"}', Submitted_At__c=Datetime.now())
        };
        Test.startTest();
        HICPrefillCallout.handleEvents(evts);
        Test.stopTest();
        Onboarding__c after = [SELECT Prefill_Status__c FROM Onboarding__c WHERE Id=:o.Id];
        System.assertEquals('Received', after.Prefill_Status__c);
    }

    @IsTest static void failurePathLogsErrorAndFlips() {
        Onboarding__c o = mkOnboarding();
        Test.setMock(HttpCalloutMock.class, new MockFail());
        Test.startTest();
        System.enqueueJob(new HICPrefillCallout(new List<HICPrefillCallout.Request>{
            new HICPrefillCallout.Request(o.Id, o.Contact__c, '{"policy":"POL-1"}')
        }));
        Test.stopTest();
        Onboarding__c after = [SELECT Prefill_Status__c, Prefill_Error__c FROM Onboarding__c WHERE Id=:o.Id];
        System.assertEquals('Failed', after.Prefill_Status__c);
        System.assertEquals('HTTP 500', after.Prefill_Error__c);
        List<Integration_Error__c> errs = [SELECT Status_Code__c, Context__c, Response_Body__c FROM Integration_Error__c WHERE Related_Record_Id__c=:o.Id];
        System.assertEquals(1, errs.size());
        System.assertEquals(500, errs[0].Status_Code__c);
        System.assertEquals('HIC_Prefill', errs[0].Context__c);
        System.assert(errs[0].Response_Body__c.contains('boom'));
    }
}
