public with sharing class HICPrefillCallout implements Queueable, Database.AllowsCallouts {

    public class Request {
        public String onboardingId;
        public String contactId;
        public String requestJson;
        public Request(String o, String c, String r) {
            this.onboardingId = o;
            this.contactId = c;
            this.requestJson = r;
        }
    }

    private final List<Request> requests;

    public HICPrefillCallout(List<Request> requests) {
        this.requests = requests;
    }

    public static void handleEvents(List<HIC_Prefill_Requested__e> events) {
        List<Request> batch = new List<Request>();
        for (HIC_Prefill_Requested__e evt : events) {
            if (String.isBlank(evt.Onboarding_Id__c)) continue;
            batch.add(new Request(evt.Onboarding_Id__c, evt.Contact_Id__c, evt.Request_JSON__c));
        }
        if (!batch.isEmpty()) {
            System.enqueueJob(new HICPrefillCallout(batch));
        }
    }

    public void execute(QueueableContext ctx) {
        List<Onboarding__c> onboardingUpdates = new List<Onboarding__c>();
        List<Integration_Error__c> errors = new List<Integration_Error__c>();

        for (Request req : requests) {
            String body = String.isBlank(req.requestJson)
                ? JSON.serialize(new Map<String, String>{
                      'contactId' => req.contactId,
                      'onboardingId' => req.onboardingId
                  })
                : req.requestJson;

            HttpRequest httpReq = new HttpRequest();
            httpReq.setEndpoint('callout:HIC_Partner/post');
            httpReq.setMethod('POST');
            httpReq.setHeader('Content-Type', 'application/json');
            httpReq.setTimeout(20000);
            httpReq.setBody(body);

            HttpResponse res;
            Integer status;
            String responseBody;
            try {
                res = new Http().send(httpReq);
                status = res.getStatusCode();
                responseBody = res.getBody();
            } catch (Exception e) {
                errors.add(buildError(req, body, 0, e.getMessage()));
                onboardingUpdates.add(new Onboarding__c(
                    Id = req.onboardingId,
                    Prefill_Status__c = 'Failed',
                    Prefill_Error__c = truncate(e.getMessage(), 255)
                ));
                continue;
            }

            if (status >= 200 && status < 300) {
                onboardingUpdates.add(new Onboarding__c(
                    Id = req.onboardingId,
                    Prefill_Status__c = 'Received',
                    Prefill_Response_JSON__c = truncate(responseBody, 32768),
                    Prefill_Error__c = null
                ));
            } else {
                errors.add(buildError(req, body, status, responseBody));
                onboardingUpdates.add(new Onboarding__c(
                    Id = req.onboardingId,
                    Prefill_Status__c = 'Failed',
                    Prefill_Error__c = 'HTTP ' + status
                ));
            }
        }

        if (!onboardingUpdates.isEmpty()) update onboardingUpdates;
        if (!errors.isEmpty()) insert errors;
    }

    private static Integration_Error__c buildError(Request req, String body, Integer status, String responseBody) {
        return new Integration_Error__c(
            Context__c = 'HIC_Prefill',
            Related_Record_Id__c = req.onboardingId,
            Status_Code__c = status,
            Request_Payload__c = truncate(body, 32768),
            Response_Body__c = truncate(responseBody, 32768),
            Retry_Count__c = 0
        );
    }

    private static String truncate(String s, Integer max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
