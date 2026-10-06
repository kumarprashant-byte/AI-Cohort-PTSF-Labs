public with sharing class AssessorSubsidyController {

    public class CalculationResult {
        @AuraEnabled public Decimal distanceKm;
        @AuraEnabled public Decimal proposedAmount;
        @AuraEnabled public String ruleName;
        @AuraEnabled public String basis;
    }

    @AuraEnabled
    public static CalculationResult recalculate(Id applicationId) {
        if (applicationId == null) {
            throw new AuraHandledException('Application id is required.');
        }
        Subsidy_Application__c app = [
            SELECT Id, Region__c, Transport_Type__c, Distance_Km__c
            FROM Subsidy_Application__c
            WHERE Id = :applicationId
            LIMIT 1
        ];
        if (String.isBlank(app.Region__c)) {
            throw new AuraHandledException('Region is required on the application before calculating.');
        }
        if (String.isBlank(app.Transport_Type__c)) {
            throw new AuraHandledException('Transport Type is required on the application before calculating.');
        }
        if (app.Distance_Km__c == null) {
            throw new AuraHandledException('Distance (km) is required on the application before calculating.');
        }

        Subsidy_Determination_Rule__c rule = resolveRule(app.Region__c, app.Transport_Type__c, app.Distance_Km__c);
        Decimal base = rule.Base_Amount__c == null ? 0 : rule.Base_Amount__c;
        Decimal mult = rule.Multiplier__c == null ? 1 : rule.Multiplier__c;
        Decimal proposed = (base * mult).setScale(2);

        CalculationResult r = new CalculationResult();
        r.distanceKm = app.Distance_Km__c;
        r.proposedAmount = proposed;
        r.ruleName = rule.Name;
        r.basis = app.Region__c + ' · ' + app.Transport_Type__c + ' · '
            + (rule.Distance_Min_Km__c == null ? '0' : String.valueOf(rule.Distance_Min_Km__c))
            + '–'
            + (rule.Distance_Max_Km__c == null ? '∞' : String.valueOf(rule.Distance_Max_Km__c))
            + 'km → ' + base + ' × ' + mult;
        return r;
    }

    @TestVisible
    static Subsidy_Determination_Rule__c resolveRule(String region, String transportType, Decimal distanceKm) {
        List<Subsidy_Determination_Rule__c> rows = [
            SELECT Id, Name, Region__c, Transport_Type__c,
                   Distance_Min_Km__c, Distance_Max_Km__c, Base_Amount__c, Multiplier__c
            FROM Subsidy_Determination_Rule__c
            WHERE Region__c = :region
              AND Transport_Type__c = :transportType
              AND (Distance_Min_Km__c = null OR Distance_Min_Km__c <= :distanceKm)
              AND (Distance_Max_Km__c = null OR Distance_Max_Km__c > :distanceKm)
        ];
        if (rows.isEmpty()) {
            throw new AuraHandledException('No subsidy rule configured for '
                + region + ' / ' + transportType + ' / ' + distanceKm + 'km. Contact your admin.');
        }
        if (rows.size() > 1) {
            throw new AuraHandledException('Multiple overlapping subsidy rules configured for '
                + region + ' / ' + transportType + ' / ' + distanceKm + 'km. Contact your admin.');
        }
        return rows[0];
    }
}
