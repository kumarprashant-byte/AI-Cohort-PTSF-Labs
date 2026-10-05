@IsTest
private class OnboardingWizardControllerTest {

    private static Contact mkContact() {
        Contact c = new Contact(FirstName='Pat', LastName='Tester', Email='pat'+System.currentTimeMillis()+'@example.com');
        insert c;
        return c;
    }

    @IsTest static void savesFirstStepAndCreatesOnboarding() {
        Contact c = mkContact();
        Test.startTest();
        Id onbId = OnboardingWizardController.saveStep(c.Id, 'Identity', '{"firstName":"Pat"}');
        Test.stopTest();
        System.assertNotEquals(null, onbId, 'Onboarding record should be created');
        Onboarding__c saved = [SELECT Step__c, Payload_JSON__c FROM Onboarding__c WHERE Id = :onbId];
        System.assertEquals('Identity', saved.Step__c);
    }

    @IsTest static void subsequentSaveUpdatesSameRecord() {
        Contact c = mkContact();
        Id first = OnboardingWizardController.saveStep(c.Id, 'Identity', '{"a":1}');
        Id second = OnboardingWizardController.saveStep(c.Id, 'Address', '{"a":1,"b":2}');
        System.assertEquals(first, second, 'Same record should be reused across steps');
        Onboarding__c saved = [SELECT Step__c FROM Onboarding__c WHERE Id = :second];
        System.assertEquals('Address', saved.Step__c);
    }

    @IsTest static void invalidStepThrows() {
        Contact c = mkContact();
        try {
            OnboardingWizardController.saveStep(c.Id, 'NotARealStep', '{}');
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) {
            System.assert(true);
        }
    }

    @IsTest static void completeFlipsFlagAndLanguage() {
        Contact c = mkContact();
        Test.startTest();
        OnboardingWizardController.completeOnboarding(c.Id, 'fr');
        Test.stopTest();
        Contact after = [SELECT Onboarding_Complete__c, Language_Preference__c FROM Contact WHERE Id = :c.Id];
        System.assertEquals(true, after.Onboarding_Complete__c);
        System.assertEquals('fr', after.Language_Preference__c);
    }

    @IsTest static void getProgressReturnsLatest() {
        Contact c = mkContact();
        OnboardingWizardController.saveStep(c.Id, 'Identity', '{"x":1}');
        Onboarding__c got = OnboardingWizardController.getProgress(c.Id);
        System.assertNotEquals(null, got);
        System.assertEquals('Identity', got.Step__c);
    }
}
