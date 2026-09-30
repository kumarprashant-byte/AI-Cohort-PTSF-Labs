@IsTest
private class SamlJitHandlerTest {

    private static Map<String,String> baseAttrs(String region, String language) {
        Map<String,String> a = new Map<String,String>();
        a.put('Region', region);
        a.put('Language', language);
        a.put('Email', 'jit.tester@example.invalid');
        a.put('LastName', 'Tester');
        a.put('FirstName', 'Jit');
        return a;
    }

    @IsTest
    static void createUserStampsRegionAndLanguage() {
        SamlJitHandler h = new SamlJitHandler();
        Test.startTest();
        User u = h.createUser(null, null, null, 'jit.emea.' + System.currentTimeMillis(),
            baseAttrs('EMEA', 'fr'), null);
        Test.stopTest();
        User reread = [SELECT Region__c, LanguageLocaleKey FROM User WHERE Id = :u.Id];
        System.assertEquals('EMEA', reread.Region__c);
        System.assertEquals('fr', reread.LanguageLocaleKey);
    }

    @IsTest
    static void rejectsUnknownRegion() {
        SamlJitHandler h = new SamlJitHandler();
        Boolean threw = false;
        try {
            h.createUser(null, null, null, 'jit.unknown.' + System.currentTimeMillis(),
                baseAttrs('LATAM', 'es'), null);
        } catch (SamlJitHandler.JitException e) {
            threw = true;
        }
        System.assert(threw, 'JIT handler should reject unknown region');
    }

    @IsTest
    static void assignsBaseNotPHI() {
        SamlJitHandler h = new SamlJitHandler();
        Test.startTest();
        User u = h.createUser(null, null, null, 'jit.amer.' + System.currentTimeMillis(),
            baseAttrs('AMER', 'en_US'), null);
        Test.stopTest();
        List<PermissionSetAssignment> psas = [
            SELECT PermissionSet.Name FROM PermissionSetAssignment
            WHERE AssigneeId = :u.Id AND PermissionSet.Name != null
        ];
        Boolean hasBase = false;
        Boolean hasPhi = false;
        for (PermissionSetAssignment psa : psas) {
            if (psa.PermissionSet.Name == 'Assessor_Base') hasBase = true;
            if (psa.PermissionSet.Name.containsIgnoreCase('Medical') ||
                psa.PermissionSet.Name.containsIgnoreCase('Break_Glass')) hasPhi = true;
        }
        System.assert(hasBase, 'Assessor_Base must be assigned');
        System.assert(!hasPhi, 'PHI perm set must NOT be assigned by JIT');
    }
}
