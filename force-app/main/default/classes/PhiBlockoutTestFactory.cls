@IsTest
public class PhiBlockoutTestFactory {

    public static User denyUserFor(String profileName) {
        return makeUser(profileName, null);
    }

    public static User complianceOfficerWithEmergencyAccess() {
        User u = makeUser('Standard User', 'ComplianceOff');
        PermissionSet ps = [SELECT Id FROM PermissionSet WHERE Name = 'PHI_Emergency_Access' LIMIT 1];
        insert new PermissionSetAssignment(AssigneeId = u.Id, PermissionSetId = ps.Id);
        return u;
    }

    private static User makeUser(String profileName, String aliasPrefix) {
        Profile p = [SELECT Id FROM Profile WHERE Name = :profileName LIMIT 1];
        String uniq = String.valueOf(DateTime.now().getTime()) + String.valueOf(Math.mod(Math.abs(Crypto.getRandomInteger()), 10000));
        String alias = (aliasPrefix == null ? 'phi' : aliasPrefix) + uniq.right(4);
        User u = new User(
            Alias = alias,
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
        return u;
    }
}
