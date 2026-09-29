@IsTest(SeeAllData=true)
private class AssessmentFormControllerTest {

    private static Contact makePractitioner() {
        Contact c = new Contact(LastName = 'Prac ' + Crypto.getRandomInteger(), Region__c = 'APAC');
        insert c;
        return c;
    }
    private static Contact makePatient() {
        Contact c = new Contact(LastName = 'Pat ' + Crypto.getRandomInteger(), Region__c = 'APAC');
        insert c;
        return c;
    }
    private static Subsidy_Application__c makeApp(Id patientId, String treatmentTypeName) {
        Treatment_Type__c tt;
        List<Treatment_Type__c> existing = [SELECT Id FROM Treatment_Type__c WHERE Name = :treatmentTypeName LIMIT 1];
        if (existing.isEmpty()) {
            tt = new Treatment_Type__c(Name = treatmentTypeName);
            insert tt;
        } else {
            tt = existing[0];
        }
        Subsidy_Application__c app = new Subsidy_Application__c(
            Patient__c = patientId, Status__c = 'Assigned', Treatment_Type__c = tt.Id
        );
        insert app;
        return app;
    }
    private static Assignment__c makeAssignment(Id appId, Id practitionerId) {
        Assignment__c a = new Assignment__c(
            Application__c = appId, Practitioner_Contact__c = practitionerId, Status__c = 'Assigned'
        );
        insert a;
        return a;
    }

    @IsTest static void getFormSchemaReturnsMatchingSchema() {
        Contact prac = makePractitioner();
        Contact pat = makePatient();
        Subsidy_Application__c app = makeApp(pat.Id, 'Oncology');
        Assignment__c asg = makeAssignment(app.Id, prac.Id);

        Test.startTest();
        AssessmentFormController.FormPayload payload = AssessmentFormController.getFormSchema(asg.Id);
        Test.stopTest();

        System.assertEquals('Oncology', payload.treatmentType, 'treatment type flows through from Application');
        System.assert(payload.schemaJson != null && payload.schemaJson.contains('primary_tumor_site'),
            'oncology schema record must be returned');
    }

    @IsTest static void saveDraftPersistsAndUpserts() {
        Contact prac = makePractitioner();
        Contact pat = makePatient();
        Subsidy_Application__c app = makeApp(pat.Id, 'General');
        Assignment__c asg = makeAssignment(app.Id, prac.Id);

        Test.startTest();
        Id first = AssessmentFormController.saveDraft(asg.Id, '{"chief_complaint":"first"}');
        Id second = AssessmentFormController.saveDraft(asg.Id, '{"chief_complaint":"second"}');
        Test.stopTest();

        System.assertEquals(first, second, 'save-draft must upsert the same Assessment, not spawn a second');
        List<Assessment__c> all = [SELECT Id, Response_JSON__c, Status__c FROM Assessment__c WHERE Assignment__c = :asg.Id];
        System.assertEquals(1, all.size(), 'exactly one Assessment per assignment');
        System.assertEquals('Draft', all[0].Status__c);
        System.assert(all[0].Response_JSON__c.contains('second'), 'latest payload wins');
    }

    @IsTest static void submitFlipsStatusAndStampsDate() {
        Contact prac = makePractitioner();
        Contact pat = makePatient();
        Subsidy_Application__c app = makeApp(pat.Id, 'General');
        Assignment__c asg = makeAssignment(app.Id, prac.Id);

        Test.startTest();
        AssessmentFormController.saveDraft(asg.Id, '{"chief_complaint":"x"}');
        Id sid = AssessmentFormController.submitAssessment(asg.Id, '{"chief_complaint":"final","severity_0_10":5}');
        Test.stopTest();

        Assessment__c after = [SELECT Status__c, Submitted_Date__c FROM Assessment__c WHERE Id = :sid];
        System.assertEquals('Pending Review', after.Status__c);
        System.assertNotEquals(null, after.Submitted_Date__c, 'Submitted_Date must be stamped');
    }

    @IsTest static void shareRowInsertedWhenAssignmentOwnerDiffersFromCreator() {
        Contact prac = makePractitioner();
        Contact pat = makePatient();
        Subsidy_Application__c app = makeApp(pat.Id, 'General');
        Assignment__c asg = makeAssignment(app.Id, prac.Id);

        Profile p = [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1];
        String uniq = 'shareTst' + Datetime.now().getTime() + Crypto.getRandomInteger();
        User u = new User(
            FirstName = 'Share', LastName = 'Tester',
            Username = uniq + '@ptsf.test.invalid',
            Alias = 'shrTst', Email = uniq + '@ptsf.test.invalid',
            TimeZoneSidKey = 'Australia/Sydney', LocaleSidKey = 'en_AU',
            EmailEncodingKey = 'UTF-8', LanguageLocaleKey = 'en_US',
            ProfileId = p.Id
        );
        insert u;
        asg.OwnerId = u.Id;
        update asg;

        Test.startTest();
        Id assessId = AssessmentFormController.saveDraft(asg.Id, '{}');
        Test.stopTest();

        List<Assessment__Share> shares = [
            SELECT UserOrGroupId, AccessLevel FROM Assessment__Share
            WHERE ParentId = :assessId AND RowCause = 'Manual'
        ];
        System.assertEquals(1, shares.size(), 'one manual share for the differing Assignment owner');
        System.assertEquals(u.Id, shares[0].UserOrGroupId);
        System.assertEquals('Edit', shares[0].AccessLevel);
    }

    @IsTest static void shareRowInsertedOnInsert() {
        Contact prac = makePractitioner();
        Contact pat = makePatient();
        Subsidy_Application__c app = makeApp(pat.Id, 'General');
        Assignment__c asg = makeAssignment(app.Id, prac.Id);

        // Manually own the assignment via a non-running user is heavy in tests; instead,
        // assert the trigger fires and does not error, and (when the running user isn't the owner)
        // that a share row is inserted. Running-user-as-owner is a no-op by design.
        Test.startTest();
        Id assessId = AssessmentFormController.saveDraft(asg.Id, '{}');
        Test.stopTest();

        Assignment__c a2 = [SELECT OwnerId FROM Assignment__c WHERE Id = :asg.Id];
        Integer expectedShares = (a2.OwnerId == UserInfo.getUserId()) ? 0 : 1;
        List<Assessment__Share> shares = [
            SELECT UserOrGroupId, AccessLevel, RowCause
            FROM Assessment__Share
            WHERE ParentId = :assessId AND RowCause = 'Manual'
        ];
        System.assertEquals(expectedShares, shares.size(),
            'expected ' + expectedShares + ' manual share row(s) (0 when running user already owns Assignment)');
        if (expectedShares == 1) {
            System.assertEquals('Edit', shares[0].AccessLevel);
            System.assertEquals(a2.OwnerId, shares[0].UserOrGroupId);
        }
    }

    @IsTest static void contentDocumentLinksToAssessment() {
        Contact prac = makePractitioner();
        Contact pat = makePatient();
        Subsidy_Application__c app = makeApp(pat.Id, 'General');
        Assignment__c asg = makeAssignment(app.Id, prac.Id);
        Id assessId = AssessmentFormController.saveDraft(asg.Id, '{}');

        ContentVersion cv = new ContentVersion(
            Title = 'imaging.pdf', PathOnClient = 'imaging.pdf',
            VersionData = Blob.valueOf('fake-imaging-bytes'), IsMajorVersion = true
        );
        insert cv;
        ContentVersion cvIns = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id];

        Test.startTest();
        insert new ContentDocumentLink(
            LinkedEntityId = assessId, ContentDocumentId = cvIns.ContentDocumentId, ShareType = 'V'
        );
        Test.stopTest();

        Integer linked = [SELECT COUNT() FROM ContentDocumentLink WHERE LinkedEntityId = :assessId];
        System.assert(linked >= 1, 'ContentDocumentLink must resolve to the Assessment');
    }
}
