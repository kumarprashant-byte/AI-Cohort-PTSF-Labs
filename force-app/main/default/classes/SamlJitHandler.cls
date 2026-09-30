public class SamlJitHandler implements Auth.SamlJitHandler {

    private static final Set<String> VALID_REGIONS = new Set<String>{'EMEA','AMER','APAC'};
    private static final String BASE_PERMSET = 'Assessor_Base';

    public User createUser(
        Id samlSsoProviderId,
        Id communityId,
        Id portalId,
        String federationIdentifier,
        Map<String,String> attributes,
        String assertion
    ) {
        String region = attributes.get('Region');
        String language = attributes.get('Language');
        if (region == null || !VALID_REGIONS.contains(region)) {
            throw new JitException('SAML assertion missing or unknown Region: ' + region);
        }
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        User u = new User(
            Username = federationIdentifier + '@ptsf.internal.' + region.toLowerCase(),
            Email = attributes.get('Email'),
            LastName = attributes.get('LastName') != null ? attributes.get('LastName') : federationIdentifier,
            FirstName = attributes.get('FirstName'),
            Alias = federationIdentifier.left(8),
            FederationIdentifier = federationIdentifier,
            ProfileId = p.Id,
            Region__c = region,
            LanguageLocaleKey = language != null ? language : 'en_US',
            LocaleSidKey = language != null ? language : 'en_US',
            EmailEncodingKey = 'UTF-8',
            TimeZoneSidKey = 'GMT'
        );
        insert u;
        assignBasePermSet(u.Id);
        return u;
    }

    public void updateUser(
        Id userId,
        Id samlSsoProviderId,
        Id communityId,
        Id portalId,
        String federationIdentifier,
        Map<String,String> attributes,
        String assertion
    ) {
        String region = attributes.get('Region');
        String language = attributes.get('Language');
        if (region != null && VALID_REGIONS.contains(region)) {
            update new User(Id = userId, Region__c = region,
                LanguageLocaleKey = language != null ? language : 'en_US');
        }
    }

    private void assignBasePermSet(Id userId) {
        PermissionSet ps = [SELECT Id FROM PermissionSet WHERE Name = :BASE_PERMSET LIMIT 1];
        insert new PermissionSetAssignment(AssigneeId = userId, PermissionSetId = ps.Id);
    }

    public class JitException extends Exception {}
}
