public without sharing class HICRequestHandler {

    public static void handlePrefill(List<HIC_Prefill_Requested__e> events) {
        upsertAndEnqueue('Prefill', collect(events));
    }

    public static void handleEntitlement(List<HIC_Entitlement_Requested__e> events) {
        upsertAndEnqueue('Entitlement', collect(events));
    }

    private static List<RequestInput> collect(List<SObject> events) {
        List<RequestInput> out = new List<RequestInput>();
        for (SObject e : events) {
            RequestInput r = new RequestInput();
            r.sourceRecordId = (String) e.get('Source_Record_Id__c');
            r.submittedAt = (Datetime) e.get('Submitted_At__c');
            r.requestJson = (String) e.get('Request_JSON__c');
            out.add(r);
        }
        return out;
    }

    private static void upsertAndEnqueue(String kind, List<RequestInput> inputs) {
        if (inputs.isEmpty()) return;

        Map<String, HIC_Check__c> byKey = new Map<String, HIC_Check__c>();
        for (RequestInput r : inputs) {
            String key = HICIdempotency.keyFor(r.sourceRecordId, r.submittedAt);
            if (byKey.containsKey(key)) continue;
            HIC_Check__c row = new HIC_Check__c(
                Idempotency_Key__c = key,
                Kind__c = kind,
                Status__c = 'Pending',
                Source_Record_Id__c = r.sourceRecordId,
                Source_Object__c = inferSourceObject(r.sourceRecordId),
                Submitted_At__c = r.submittedAt,
                Request_JSON__c = r.requestJson,
                Attempt_Count__c = 0
            );
            byKey.put(key, row);
        }

        Set<String> incomingKeys = byKey.keySet();
        Map<String, Id> existing = new Map<String, Id>();
        for (HIC_Check__c e : [
            SELECT Id, Idempotency_Key__c FROM HIC_Check__c
            WHERE Idempotency_Key__c IN :incomingKeys
        ]) {
            existing.put(e.Idempotency_Key__c, e.Id);
        }

        List<HIC_Check__c> toInsert = new List<HIC_Check__c>();
        for (String key : byKey.keySet()) {
            if (!existing.containsKey(key)) toInsert.add(byKey.get(key));
        }
        if (!toInsert.isEmpty()) insert toInsert;

        for (HIC_Check__c row : toInsert) {
            if (!System.isBatch() && !System.isFuture() && Limits.getQueueableJobs() < Limits.getLimitQueueableJobs()) {
                System.enqueueJob(new HICQueueable(row.Id));
            }
        }
    }

    private static String inferSourceObject(String recordId) {
        if (String.isBlank(recordId) || recordId.length() < 3) return null;
        String prefix = recordId.substring(0, 3);
        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
        for (String name : new List<String>{ 'Subsidy_Application__c', 'Onboarding__c' }) {
            Schema.SObjectType t = gd.get(name);
            if (t != null && t.getDescribe().getKeyPrefix() == prefix) return name;
        }
        return null;
    }

    public class RequestInput {
        public String sourceRecordId;
        public Datetime submittedAt;
        public String requestJson;
    }
}
