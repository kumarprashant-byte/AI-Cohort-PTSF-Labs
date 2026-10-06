/**
 * INT-028 — Backs the faqChatPanel LWC. Reads the four Assessor_FAQ__mdt
 * entries, opens a Case on Assessor_Chat_Queue when a user escalates, and
 * round-trips FeedItem replies on the Case.
 *
 * PHI kill-list stems come from INT-004's Medical_History__c inventory;
 * when any stem is contained in the inbound question, the Case is created
 * with PHI_Flagged__c=true and the Subject carries only the flag label —
 * never an echo of the user's text.
 */
public with sharing class AssessorFaqController {

    @TestVisible private static final Set<String> PHI_STEMS = new Set<String>{
        'diagnos', 'medic', 'allerg', 'condition', 'illness', 'symptom'
    };
    @TestVisible private static final String PHI_FLAG_SUBJECT = '[Assessor Chat — PHI flagged]';
    @TestVisible private static final String QUEUE_DEV_NAME = 'Assessor_Chat_Queue';

    @AuraEnabled(cacheable=true)
    public static List<Assessor_FAQ__mdt> getFaqs() {
        return [
            SELECT DeveloperName, Topic__c, Trigger_Phrases__c, Answer_Body__c
            FROM Assessor_FAQ__mdt
            ORDER BY Topic__c ASC
        ];
    }

    @AuraEnabled
    public static Id createChatCase(String question) {
        if (String.isBlank(question)) {
            throw new AuraHandledException('Question cannot be blank.');
        }
        Boolean flagged = containsPhiStem(question);
        Id queueId = resolveQueueId();

        Case c = new Case(
            Origin = 'Chat',
            Status = 'New',
            OwnerId = queueId,
            Description = question,
            PHI_Flagged__c = flagged,
            Subject = flagged
                ? PHI_FLAG_SUBJECT
                : '[Assessor Chat] ' + question.left(60)
        );
        insert c;
        return c.Id;
    }

    @AuraEnabled
    public static Id postReply(Id caseId, String message) {
        if (caseId == null || String.isBlank(message)) {
            throw new AuraHandledException('Case id and message are required.');
        }
        CaseComment cc = new CaseComment(
            ParentId = caseId,
            CommentBody = message,
            IsPublished = true
        );
        insert cc;
        return cc.Id;
    }

    @AuraEnabled(cacheable=false)
    public static List<CaseComment> getReplies(Id caseId) {
        if (caseId == null) return new List<CaseComment>();
        return [
            SELECT Id, CommentBody, CreatedById, CreatedBy.Name, CreatedDate
            FROM CaseComment
            WHERE ParentId = :caseId
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];
    }

    @TestVisible
    static Boolean containsPhiStem(String q) {
        if (String.isBlank(q)) return false;
        String lower = q.toLowerCase();
        for (String stem : PHI_STEMS) {
            if (lower.contains(stem)) return true;
        }
        return false;
    }

    @TestVisible
    static Id resolveQueueId() {
        List<Group> queues = [
            SELECT Id FROM Group
            WHERE Type = 'Queue' AND DeveloperName = :QUEUE_DEV_NAME
            LIMIT 1
        ];
        if (queues.isEmpty()) {
            throw new AuraHandledException('Assessor_Chat_Queue is not provisioned.');
        }
        return queues[0].Id;
    }
}
