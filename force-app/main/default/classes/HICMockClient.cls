@IsTest
public class HICMockClient implements IHICClient {
    public Boolean shouldSucceed = true;
    public String responseBody = '{"ok":true}';
    public Integer callCount = 0;
    public HICClientTypes.HICResponse call(HICClientTypes.HICRequest req) {
        callCount++;
        HICClientTypes.HICResponse r = new HICClientTypes.HICResponse();
        r.success = shouldSucceed;
        r.httpStatus = shouldSucceed ? 200 : 500;
        r.bodyJson = responseBody;
        if (!shouldSucceed) r.errorMessage = 'mock failure';
        return r;
    }
}
