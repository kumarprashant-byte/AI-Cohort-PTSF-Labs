trigger HICPrefillRequestedTrigger on HIC_Prefill_Requested__e (after insert) {
    HICPrefillCallout.handleEvents(Trigger.new);
}
