public with sharing class OnboardingWizardController {

    private static final Set<String> VALID_STEPS = new Set<String>{
        'Identity','Address','Language','Insurance','Summary'
    };

    @AuraEnabled
    public static Id saveStep(Id contactId, String step, String payloadJson) {
        if (contactId == null || !VALID_STEPS.contains(step)) {
            throw new AuraHandledException('Invalid step or missing contactId');
        }
        List<Onboarding__c> existing = [
            SELECT Id FROM Onboarding__c WHERE Contact__c = :contactId LIMIT 1
        ];
        Onboarding__c rec;
        if (existing.isEmpty()) {
            rec = new Onboarding__c(Contact__c = contactId, Step__c = step, Payload_JSON__c = payloadJson);
            insert rec;
            publishPrefillRequest(contactId, rec.Id);
        } else {
            rec = existing[0];
            rec.Step__c = step;
            rec.Payload_JSON__c = payloadJson;
            update rec;
        }
        return rec.Id;
    }

    @AuraEnabled
    public static void completeOnboarding(Id contactId, String language) {
        if (contactId == null) {
            throw new AuraHandledException('Missing contactId');
        }
        Contact c = new Contact(Id = contactId, Onboarding_Complete__c = true);
        if (String.isNotBlank(language)) {
            c.Language_Preference__c = language;
        }
        update c;
        sendWelcomeEmail(contactId, language);
    }

    @TestVisible
    private static void sendWelcomeEmail(Id contactId, String language) {
        String devName = resolveTemplateDevName(language);
        List<EmailTemplate> tmpls = [SELECT Id FROM EmailTemplate WHERE DeveloperName = :devName LIMIT 1];
        if (tmpls.isEmpty()) return;
        Messaging.SingleEmailMessage msg = new Messaging.SingleEmailMessage();
        msg.setTargetObjectId(contactId);
        msg.setTemplateId(tmpls[0].Id);
        msg.setSaveAsActivity(false);
        if (!Test.isRunningTest()) {
            Messaging.sendEmail(new Messaging.SingleEmailMessage[]{ msg });
        }
    }

    private static String resolveTemplateDevName(String language) {
        if (language == 'fr')    return 'Welcome_Email_fr';
        if (language == 'de')    return 'Welcome_Email_de';
        if (language == 'zh_CN') return 'Welcome_Email_zh_CN';
        if (language == 'ja')    return 'Welcome_Email_ja';
        return 'Welcome_Email_en_US';
    }

    @AuraEnabled(cacheable=true)
    public static Onboarding__c getProgress(Id contactId) {
        List<Onboarding__c> rows = [
            SELECT Id, Step__c, Payload_JSON__c
            FROM Onboarding__c WHERE Contact__c = :contactId LIMIT 1
        ];
        return rows.isEmpty() ? null : rows[0];
    }

    private static void publishPrefillRequest(Id contactId, Id onboardingId) {
        HIC_Prefill_Requested__e evt = new HIC_Prefill_Requested__e(
            Contact_Id__c = String.valueOf(contactId),
            Onboarding_Id__c = String.valueOf(onboardingId),
            Submitted_At__c = Datetime.now()
        );
        EventBus.publish(evt);
    }
}
