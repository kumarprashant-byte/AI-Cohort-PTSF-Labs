public without sharing class AssignmentSlaCheckAction {

    private static final Long THREE_BUSINESS_DAYS_MS = 3L * 8L * 60L * 60L * 1000L;
    private static final Map<String, String> REGION_TO_BUSINESS_HOURS_NAME = new Map<String, String>{
        'APAC' => 'PTSF_APAC_Support',
        'EMEA' => 'PTSF_EMEA_Support',
        'AMER' => 'PTSF_AMER_Support'
    };

    @InvocableMethod(label='PTSF: Check Assignment SLA and Reassign' category='PTSF')
    public static void checkAndReassign(List<String> inputs) {
        run();
    }

    public static void run() {
        List<Assignment__c> open = [
            SELECT Id, Status__c, Assigned_Date__c, Application__c,
                   Practitioner_Contact__c, Practitioner_Contact__r.Region__c,
                   OwnerId
            FROM Assignment__c
            WHERE Status__c = 'Assigned' AND Accepted_Date__c = null
        ];
        if (open.isEmpty()) return;

        Map<String, Id> businessHoursByRegion = loadBusinessHoursByRegion();
        Datetime now = Datetime.now();

        List<Assignment__c> toReassign = new List<Assignment__c>();
        Set<Id> applicationIds = new Set<Id>();
        Set<Id> ownerIds = new Set<Id>();

        for (Assignment__c a : open) {
            if (a.Practitioner_Contact__c == null || a.Practitioner_Contact__r.Region__c == null) continue;
            Id bhId = businessHoursByRegion.get(a.Practitioner_Contact__r.Region__c);
            if (bhId == null) continue;

            Long elapsed = BusinessHours.diff(bhId, a.Assigned_Date__c, now);
            if (elapsed < THREE_BUSINESS_DAYS_MS) continue;

            a.Status__c = 'Reassigned';
            toReassign.add(a);
            if (a.Application__c != null) applicationIds.add(a.Application__c);
            if (a.OwnerId != null) ownerIds.add(a.OwnerId);
        }

        if (toReassign.isEmpty()) return;

        Map<Id, Subsidy_Application__c> appsById = new Map<Id, Subsidy_Application__c>(
            [SELECT Id, Previously_Declined_Practitioners__c
             FROM Subsidy_Application__c
             WHERE Id IN :applicationIds]
        );

        for (Assignment__c a : toReassign) {
            Subsidy_Application__c app = appsById.get(a.Application__c);
            if (app == null) continue;
            String prior = app.Previously_Declined_Practitioners__c;
            String contactId = String.valueOf(a.Practitioner_Contact__c);
            if (String.isBlank(prior)) {
                app.Previously_Declined_Practitioners__c = contactId;
            } else if (!prior.contains(contactId)) {
                app.Previously_Declined_Practitioners__c = prior + ';' + contactId;
            }
        }

        update toReassign;
        if (!appsById.isEmpty()) update appsById.values();

        sendReassignmentEmails(toReassign, ownerIds);
    }

    private static Map<String, Id> loadBusinessHoursByRegion() {
        Map<String, Id> out = new Map<String, Id>();
        for (BusinessHours bh : [SELECT Id, Name FROM BusinessHours WHERE Name IN :REGION_TO_BUSINESS_HOURS_NAME.values()]) {
            for (String region : REGION_TO_BUSINESS_HOURS_NAME.keySet()) {
                if (REGION_TO_BUSINESS_HOURS_NAME.get(region) == bh.Name) {
                    out.put(region, bh.Id);
                }
            }
        }
        return out;
    }

    private static void sendReassignmentEmails(List<Assignment__c> reassigned, Set<Id> ownerIds) {
        if (ownerIds.isEmpty()) return;
        Map<Id, User> ownerById = new Map<Id, User>(
            [SELECT Id, Email FROM User WHERE Id IN :ownerIds AND Email != null]
        );

        List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();
        for (Assignment__c a : reassigned) {
            User owner = ownerById.get(a.OwnerId);
            if (owner == null) continue;
            Messaging.SingleEmailMessage m = new Messaging.SingleEmailMessage();
            m.setToAddresses(new List<String>{ owner.Email });
            m.setSubject('Your PTSF assignment has been reassigned');
            m.setPlainTextBody(
                'Your assignment (' + a.Id + ') was not accepted within 3 business days ' +
                'and has been reassigned. No further action is required on your part.'
            );
            m.setSaveAsActivity(false);
            emails.add(m);
        }
        if (!emails.isEmpty()) Messaging.sendEmail(emails, false);
    }
}
