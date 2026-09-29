trigger HICEntitlementRequestedTrigger on HIC_Entitlement_Requested__e (after insert) {
    HICRequestHandler.handleEntitlement(Trigger.new);
}
