// INT-024 — seed Subsidy_Determination_Rule__c with the minimum rows needed
// to prove the acceptance walkthrough (EMEA Road 180km → 1,200 EUR;
// EMEA Air 180km → 2,400 EUR). Full regional matrix is operational follow-up.
//
// Idempotent: upserts by Name = <Region>-<Transport>-<MinKm>.

List<Subsidy_Determination_Rule__c> seeds = new List<Subsidy_Determination_Rule__c>{
    new Subsidy_Determination_Rule__c(
        Name = 'EMEA-Road-100',
        Region__c = 'EMEA',
        Transport_Type__c = 'Road',
        Distance_Min_Km__c = 100,
        Distance_Max_Km__c = 300,
        Base_Amount__c = 1000,
        Multiplier__c = 1.2,
        Threshold__c = 1500
    ),
    new Subsidy_Determination_Rule__c(
        Name = 'EMEA-Air-100',
        Region__c = 'EMEA',
        Transport_Type__c = 'Air',
        Distance_Min_Km__c = 100,
        Distance_Max_Km__c = 300,
        Base_Amount__c = 1500,
        Multiplier__c = 1.6,
        Threshold__c = 1500
    )
};

Map<String, Subsidy_Determination_Rule__c> byName = new Map<String, Subsidy_Determination_Rule__c>();
for (Subsidy_Determination_Rule__c r : seeds) byName.put(r.Name, r);

for (Subsidy_Determination_Rule__c existing :
     [SELECT Id, Name FROM Subsidy_Determination_Rule__c WHERE Name IN :byName.keySet()]) {
    byName.get(existing.Name).Id = existing.Id;
}

upsert byName.values();

System.debug('INT-024 seeded ' + byName.size() + ' rules: ' + byName.keySet());
