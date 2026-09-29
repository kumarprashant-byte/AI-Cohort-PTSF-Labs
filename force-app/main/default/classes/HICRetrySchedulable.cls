public without sharing class HICRetrySchedulable implements Schedulable {

    public void execute(SchedulableContext ctx) { runNow(); }

    public static void runNow() {
        Datetime now = Datetime.now();
        Datetime cutoff = now.addHours(-24);
        List<HIC_Check__c> due = [
            SELECT Id FROM HIC_Check__c
            WHERE Status__c IN ('Deferred', 'In Progress')
              AND Next_Attempt_At__c != null
              AND Next_Attempt_At__c <= :now
              AND CreatedDate > :cutoff
            ORDER BY Next_Attempt_At__c ASC
            LIMIT 50
        ];
        for (HIC_Check__c r : due) {
            if (Limits.getQueueableJobs() >= Limits.getLimitQueueableJobs()) break;
            System.enqueueJob(new HICQueueable(r.Id));
        }
    }
}
