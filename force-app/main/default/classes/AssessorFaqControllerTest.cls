@IsTest(SeeAllData=false)
private class AssessorFaqControllerTest {

    @TestSetup
    static void setup() {
        Group q = new Group(
            Name = 'Assessor Chat Queue',
            DeveloperName = 'Assessor_Chat_Queue',
            Type = 'Queue'
        );
        insert q;
        insert new QueueSobject(QueueId = q.Id, SobjectType = 'Case');
    }

    private static Id queueId() {
        return [SELECT Id FROM Group WHERE DeveloperName = 'Assessor_Chat_Queue' LIMIT 1].Id;
    }

    @IsTest
    static void getFaqsReturnsSeededEntries() {
        // CMT reads do not need SeeAllData — Assessor_FAQ__mdt records deployed in-org are visible to tests.
        List<Assessor_FAQ__mdt> faqs = AssessorFaqController.getFaqs();
        System.assert(faqs.size() >= 4, 'Expected at least 4 seeded FAQ entries, got ' + faqs.size());
        Set<String> names = new Set<String>();
        for (Assessor_FAQ__mdt f : faqs) names.add(f.DeveloperName);
        System.assert(names.contains('Application_Status'), 'Application_Status missing');
        System.assert(names.contains('Required_Documents'), 'Required_Documents missing');
        System.assert(names.contains('Assessment_Timeline'), 'Assessment_Timeline missing');
        System.assert(names.contains('Assignment_Acceptance'), 'Assignment_Acceptance missing');
    }

    @IsTest
    static void createChatCaseLandsOnQueue() {
        Test.startTest();
        Id caseId = AssessorFaqController.createChatCase('where is my application?');
        Test.stopTest();

        Case c = [
            SELECT Id, Origin, Status, OwnerId, PHI_Flagged__c, Subject, Description
            FROM Case WHERE Id = :caseId
        ];
        System.assertEquals('Chat', c.Origin, 'Origin should be Chat');
        System.assertEquals('New', c.Status, 'Status should be New');
        System.assertEquals(queueId(), c.OwnerId, 'Owner should be Assessor_Chat_Queue');
        System.assertEquals(false, c.PHI_Flagged__c, 'Non-PHI question must not flag');
        System.assert(c.Subject.startsWith('[Assessor Chat] '), 'Subject prefix mismatch: ' + c.Subject);
        System.assertEquals('where is my application?', c.Description, 'Description should carry full question');
    }

    @IsTest
    static void phiKeywordScrubsSubject() {
        Map<String, String> probes = new Map<String, String>{
            'diagnos'   => 'my diagnosis is unclear',
            'medic'     => 'what medication is prescribed',
            'allerg'    => 'allergy to peanuts',
            'condition' => 'chronic condition update',
            'illness'   => 'has a serious illness',
            'symptom'   => 'the symptom started yesterday'
        };
        for (String stem : probes.keySet()) {
            String q = probes.get(stem);
            Id caseId = AssessorFaqController.createChatCase(q);
            Case c = [
                SELECT PHI_Flagged__c, Subject, Description
                FROM Case WHERE Id = :caseId
            ];
            System.assertEquals(true, c.PHI_Flagged__c, 'Stem ' + stem + ' should flag');
            System.assertEquals('[Assessor Chat — PHI flagged]', c.Subject,
                'Subject must be the fixed PHI label (stem: ' + stem + ')');
            System.assertEquals(false, c.Subject.toLowerCase().contains(stem),
                'Subject must not echo PHI stem ' + stem);
            System.assertEquals(q, c.Description, 'Description still carries the full question');
        }
    }

    @IsTest
    static void replyRoundTrip() {
        Id caseId = AssessorFaqController.createChatCase('general question');
        Test.startTest();
        Id feedId = AssessorFaqController.postReply(caseId, 'hello from assessor');
        Test.stopTest();

        List<FeedItem> replies = AssessorFaqController.getReplies(caseId);
        System.assert(replies.size() >= 1, 'Expected at least one reply');
        Boolean found = false;
        for (FeedItem fi : replies) {
            if (fi.Id == feedId && fi.Body == 'hello from assessor') { found = true; break; }
        }
        System.assert(found, 'Posted FeedItem not returned by getReplies');
    }

    @IsTest
    static void containsPhiStemHandlesBlank() {
        System.assertEquals(false, AssessorFaqController.containsPhiStem(null));
        System.assertEquals(false, AssessorFaqController.containsPhiStem(''));
        System.assertEquals(false, AssessorFaqController.containsPhiStem('   '));
    }

    @IsTest
    static void createChatCaseRejectsBlank() {
        Boolean threw = false;
        try { AssessorFaqController.createChatCase('   '); }
        catch (AuraHandledException e) { threw = true; }
        System.assertEquals(true, threw, 'Blank question must throw');
    }
}
