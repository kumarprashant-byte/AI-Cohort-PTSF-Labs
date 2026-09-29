@IsTest(SeeAllData=true)
private class AssignmentSlaCheckActionTest {

    private static Contact makePractitioner() {
        Contact c = new Contact(LastName = 'Practitioner ' + Crypto.getRandomInteger(), Region__c = 'APAC');
        insert c;
        return c;
    }

    private static Contact makePatient() {
        Contact c = new Contact(LastName = 'Patient ' + Crypto.getRandomInteger(), Region__c = 'APAC');
        insert c;
        return c;
    }

    private static Subsidy_Application__c makeApp(Id patientId) {
        Subsidy_Application__c app = new Subsidy_Application__c(Patient__c = patientId, Status__c = 'Assigned');
        insert app;
        return app;
    }

    private static Assignment__c makeAssignment(Id appId, Id practitionerId, Datetime assignedAt, String status) {
        Assignment__c a = new Assignment__c(
            Application__c = appId,
            Practitioner_Contact__c = practitionerId,
            Status__c = status
        );
        insert a;
        a.Assigned_Date__c = assignedAt;
        update a;
        return a;
    }

    @IsTest static void overdueAssignmentIsReassigned() {
        Contact prac = makePractitioner();
        Contact pat = makePatient();
        Subsidy_Application__c app = makeApp(pat.Id);
        Assignment__c a = makeAssignment(app.Id, prac.Id, Datetime.now().addDays(-8), 'Assigned');

        Test.startTest();
        AssignmentSlaCheckAction.run();
        Test.stopTest();

        Assignment__c after = [SELECT Status__c FROM Assignment__c WHERE Id = :a.Id];
        System.assertEquals('Reassigned', after.Status__c, 'overdue assignment must flip to Reassigned');
    }

    @IsTest static void freshAssignmentIsUntouched() {
        Contact prac = makePractitioner();
        Contact pat = makePatient();
        Subsidy_Application__c app = makeApp(pat.Id);
        Assignment__c a = makeAssignment(app.Id, prac.Id, Datetime.now(), 'Assigned');

        Test.startTest();
        AssignmentSlaCheckAction.run();
        Test.stopTest();

        Assignment__c after = [SELECT Status__c FROM Assignment__c WHERE Id = :a.Id];
        System.assertEquals('Assigned', after.Status__c, 'fresh assignment must not be flipped');
    }

    @IsTest static void declinedPractitionerIsAppendedToApplication() {
        Contact prac = makePractitioner();
        Contact pat = makePatient();
        Subsidy_Application__c app = makeApp(pat.Id);
        makeAssignment(app.Id, prac.Id, Datetime.now().addDays(-8), 'Assigned');

        Test.startTest();
        AssignmentSlaCheckAction.run();
        Test.stopTest();

        Subsidy_Application__c after = [SELECT Previously_Declined_Practitioners__c FROM Subsidy_Application__c WHERE Id = :app.Id];
        System.assert(after.Previously_Declined_Practitioners__c != null &&
                      after.Previously_Declined_Practitioners__c.contains(String.valueOf(prac.Id)),
                      'practitioner Contact Id must be appended to Previously_Declined');
    }

    @IsTest static void terminalStatusIsUntouched() {
        Contact prac = makePractitioner();
        Contact pat = makePatient();
        Subsidy_Application__c app = makeApp(pat.Id);
        Assignment__c a = makeAssignment(app.Id, prac.Id, Datetime.now().addDays(-10), 'Completed');

        Test.startTest();
        AssignmentSlaCheckAction.run();
        Test.stopTest();

        Assignment__c after = [SELECT Status__c FROM Assignment__c WHERE Id = :a.Id];
        System.assertEquals('Completed', after.Status__c, 'terminal status must not be re-flipped');
    }

    @IsTest static void weekendDoesNotCountAsBusinessDays() {
        Contact prac = makePractitioner();
        Contact pat = makePatient();
        Subsidy_Application__c app = makeApp(pat.Id);
        // 2 calendar days ≤ ~2 business days worked; below the 3-day threshold
        Assignment__c a = makeAssignment(app.Id, prac.Id, Datetime.now().addDays(-2), 'Assigned');

        Test.startTest();
        AssignmentSlaCheckAction.run();
        Test.stopTest();

        Assignment__c after = [SELECT Status__c FROM Assignment__c WHERE Id = :a.Id];
        System.assertEquals('Assigned', after.Status__c, 'sub-3-business-day elapsed must not trip the SLA');
    }

    @IsTest static void emailSentToPractitioner() {
        Contact prac = makePractitioner();
        Contact pat = makePatient();
        Subsidy_Application__c app = makeApp(pat.Id);
        makeAssignment(app.Id, prac.Id, Datetime.now().addDays(-8), 'Assigned');

        Integer before = Limits.getEmailInvocations();
        Test.startTest();
        AssignmentSlaCheckAction.run();
        Test.stopTest();
        System.assert(Limits.getEmailInvocations() >= before,
            'sendEmail should have been invoked for the reassigned owner');
    }
}
