@IsTest
private class HICCalloutClientTest {

    private class CapturingMock implements HttpCalloutMock {
        public HttpRequest captured;
        public HttpResponse respond(HttpRequest req) {
            this.captured = req;
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"ok":true}');
            return res;
        }
    }

    @IsTest static void buildsRequestWithNamedCredentialAndTimeout() {
        CapturingMock mock = new CapturingMock();
        Test.setMock(HttpCalloutMock.class, mock);

        HICClientTypes.HICRequest req = new HICClientTypes.HICRequest();
        req.kind = 'Prefill';
        req.sourceRecordId = 'a01000000000009AAA';
        req.submittedAt = Datetime.now();
        req.bodyJson = '{"x":1}';

        Test.startTest();
        HICClientTypes.HICResponse res = new HICCalloutClient().call(req);
        Test.stopTest();

        System.assert(res.success, 'mocked HTTP 200 → success');
        System.assert(mock.captured.getEndpoint().startsWith('callout:PTSF_HIC'), 'endpoint uses the Named Credential');
        System.assertEquals('POST', mock.captured.getMethod());
        System.assertEquals('application/json', mock.captured.getHeader('Content-Type'));
    }

    @IsTest static void calloutFailureIsReturnedAsErrorResponse() {
        Test.setMock(HttpCalloutMock.class, new AlwaysFailMock());

        HICClientTypes.HICRequest req = new HICClientTypes.HICRequest();
        req.kind = 'Prefill';
        req.sourceRecordId = 'a01000000000010AAA';
        req.submittedAt = Datetime.now();
        req.bodyJson = '{}';

        Test.startTest();
        HICClientTypes.HICResponse res = new HICCalloutClient().call(req);
        Test.stopTest();

        System.assertEquals(false, res.success, 'HTTP 500 → not success');
        System.assertNotEquals(null, res.errorMessage);
    }

    private class AlwaysFailMock implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(500);
            res.setBody('boom');
            return res;
        }
    }
}
