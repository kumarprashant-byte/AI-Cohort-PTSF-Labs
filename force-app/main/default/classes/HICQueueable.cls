public without sharing class HICQueueable implements Queueable, Database.AllowsCallouts {
    @TestVisible private static IHICClient overrideClient;
    private static final Integer MAX_ATTEMPTS = 3;

    private final Id hicCheckId;

    public HICQueueable(Id hicCheckId) { this.hicCheckId = hicCheckId; }

    public void execute(QueueableContext ctx) { runFor(this.hicCheckId); }

    public static void runFor(Id hicCheckId) {
        HIC_Check__c row = [
            SELECT Id, Kind__c, Status__c, Source_Record_Id__c, Source_Object__c,
                   Submitted_At__c, Request_JSON__c, Attempt_Count__c
            FROM HIC_Check__c WHERE Id = :hicCheckId LIMIT 1
        ];
        if (row.Status__c == 'Success') return;

        row.Status__c = 'In Progress';
        row.Attempt_Count__c = (row.Attempt_Count__c == null ? 0 : row.Attempt_Count__c) + 1;
        update row;

        HICClientTypes.HICRequest req = new HICClientTypes.HICRequest();
        req.kind = row.Kind__c;
        req.sourceRecordId = row.Source_Record_Id__c;
        req.submittedAt = row.Submitted_At__c;
        req.bodyJson = row.Request_JSON__c;

        IHICClient client = (overrideClient != null) ? overrideClient : (IHICClient) new HICCalloutClient();
        HICClientTypes.HICResponse res = client.call(req);

        if (res.success) {
            row.Status__c = 'Success';
            row.Response_JSON__c = res.bodyJson;
            row.Next_Attempt_At__c = null;
            row.Last_Error__c = null;
            update row;
            publishCompletion(row, 'Success', res.bodyJson);
        } else {
            row.Last_Error__c = truncate(res.errorMessage, 255);
            if (row.Attempt_Count__c >= MAX_ATTEMPTS) {
                row.Status__c = 'Deferred';
                row.Next_Attempt_At__c = Datetime.now().addMinutes(backoffMinutes(Integer.valueOf(row.Attempt_Count__c)));
                update row;
            } else {
                row.Status__c = 'Deferred';
                row.Next_Attempt_At__c = Datetime.now().addMinutes(backoffMinutes(Integer.valueOf(row.Attempt_Count__c)));
                update row;
            }
        }
    }

    private static Integer backoffMinutes(Integer attempt) {
        return Integer.valueOf(Math.pow(2, attempt));
    }

    private static String truncate(String s, Integer n) {
        if (s == null) return null;
        return s.length() <= n ? s : s.substring(0, n);
    }

    private static void publishCompletion(HIC_Check__c row, String status, String bodyJson) {
        SObject evt;
        if (row.Kind__c == 'Prefill') {
            evt = new HIC_Prefill_Completed__e(
                Source_Record_Id__c = row.Source_Record_Id__c,
                Status__c = status,
                Response_JSON__c = bodyJson,
                HIC_Check_Id__c = row.Id
            );
        } else {
            evt = new HIC_Entitlement_Completed__e(
                Source_Record_Id__c = row.Source_Record_Id__c,
                Status__c = status,
                Response_JSON__c = bodyJson,
                HIC_Check_Id__c = row.Id
            );
        }
        EventBus.publish(evt);
    }
}
