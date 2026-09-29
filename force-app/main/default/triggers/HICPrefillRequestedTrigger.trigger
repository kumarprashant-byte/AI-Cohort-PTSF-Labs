trigger HICPrefillRequestedTrigger on HIC_Prefill_Requested__e (after insert) {
    HICRequestHandler.handlePrefill(Trigger.new);
}
