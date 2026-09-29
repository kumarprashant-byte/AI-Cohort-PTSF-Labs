public with sharing class HICCalloutClient implements IHICClient {
    public HICClientTypes.HICResponse call(HICClientTypes.HICRequest req) {
        HttpRequest http = new HttpRequest();
        http.setEndpoint('callout:PTSF_HIC/check');
        http.setMethod('POST');
        http.setHeader('Content-Type', 'application/json');
        http.setTimeout(20000);
        http.setBody(req.bodyJson != null ? req.bodyJson : '{}');

        HICClientTypes.HICResponse out = new HICClientTypes.HICResponse();
        try {
            HttpResponse res = new Http().send(http);
            out.httpStatus = res.getStatusCode();
            out.bodyJson = res.getBody();
            out.success = res.getStatusCode() >= 200 && res.getStatusCode() < 300;
            if (!out.success) out.errorMessage = 'HTTP ' + res.getStatusCode();
        } catch (Exception e) {
            out.success = false;
            out.httpStatus = 0;
            out.errorMessage = e.getTypeName() + ': ' + e.getMessage();
        }
        return out;
    }
}
