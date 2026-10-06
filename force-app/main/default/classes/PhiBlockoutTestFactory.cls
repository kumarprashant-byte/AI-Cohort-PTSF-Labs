@IsTest
public class PhiBlockoutTestFactory {

    public static User denyUserFor(String roleName) {
        if (roleName == 'System Administrator' || roleName == 'Standard User') {
            return makeUser(roleName, new List<String>());
        }
        return makeUser('Standard User', permissionsForRole(roleName));
    }

    public static User complianceOfficerWithEmergencyAccess() {
        return makeUser('Standard User', new List<String>{ 'PHI_Emergency_Access' });
    }

    private static List<String> permissionsForRole(String roleName) {
        if (roleName == 'Assessor') return new List<String>{ 'Assessor_Base' };
        if (roleName == 'Team Manager') return new List<String>{ 'AMER_Team_Manager' };
        if (roleName == 'Regional Ops Manager') return new List<String>{ 'AMER_Regional_Ops_Manager' };
        return new List<String>();
    }

    private static User makeUser(String profileName, List<String> permissionNames) {
        Profile p = [SELECT Id FROM Profile WHERE Name = :profileName LIMIT 1];
        String uniq = String.valueOf(DateTime.now().getTime()) + String.valueOf(Math.mod(Math.abs(Crypto.getRandomInteger()), 10000));
        String tail = uniq.right(8);
        User u = new User(
            Alias = tail.left(8),
            Email = 'phi' + uniq + '@ptsf.test',
            EmailEncodingKey = 'UTF-8',
            LastName = 'PhiTestUser',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/New_York',
            Username = 'phi' + uniq + '@ptsf.test.invalid'
        );
        insert u;
        assignPermissions(u.Id, permissionNames);
        return u;
    }

    private static void assignPermissions(Id userId, List<String> permissionNames) {
        if (permissionNames == null || permissionNames.isEmpty()) return;
        Map<String, Id> psByName = new Map<String, Id>();
        for (PermissionSet ps : [SELECT Id, Name FROM PermissionSet WHERE Name IN :permissionNames]) {
            psByName.put(ps.Name, ps.Id);
        }
        Map<String, Id> psgByName = new Map<String, Id>();
        for (PermissionSetGroup psg : [SELECT Id, DeveloperName FROM PermissionSetGroup WHERE DeveloperName IN :permissionNames]) {
            psgByName.put(psg.DeveloperName, psg.Id);
        }
        List<PermissionSetAssignment> assignments = new List<PermissionSetAssignment>();
        for (String name : permissionNames) {
            if (psByName.containsKey(name)) {
                assignments.add(new PermissionSetAssignment(AssigneeId = userId, PermissionSetId = psByName.get(name)));
            } else if (psgByName.containsKey(name)) {
                assignments.add(new PermissionSetAssignment(AssigneeId = userId, PermissionSetGroupId = psgByName.get(name)));
            }
        }
        if (!assignments.isEmpty()) insert assignments;
    }
}
