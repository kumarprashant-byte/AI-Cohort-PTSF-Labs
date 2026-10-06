List<Subsidy_Determination_Rule__c> rows = [
    SELECT Name, Region__c, Transport_Type__c, Distance_Min_Km__c, Distance_Max_Km__c, Base_Amount__c, Multiplier__c
    FROM Subsidy_Determination_Rule__c
    WHERE Name LIKE 'EMEA-%'
];
for (Subsidy_Determination_Rule__c r : rows) {
    System.debug('INT-024 rule: ' + r.Name + ' | region=' + r.Region__c + ' | transport=' + r.Transport_Type__c
        + ' | band=[' + r.Distance_Min_Km__c + ',' + r.Distance_Max_Km__c + ')'
        + ' | base=' + r.Base_Amount__c + ' | mult=' + r.Multiplier__c
        + ' | proposed=' + (r.Base_Amount__c * r.Multiplier__c));
}
System.debug('INT-024 row count: ' + rows.size());

Schema.DescribeFieldResult dsr = Subsidy_Application__c.Decision_Source__c.getDescribe();
System.debug('INT-024 Decision_Source__c type: ' + dsr.getType() + ' calculated: ' + dsr.isCalculated());

// Validation rule + LWC verified via deploy manifest (Changed/Created states above).
