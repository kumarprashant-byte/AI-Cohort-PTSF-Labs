import { LightningElement, api, wire, track } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import STATUS from '@salesforce/schema/Subsidy_Application__c.Status__c';
import APPROVED from '@salesforce/schema/Subsidy_Application__c.Approved_Amount__c';
import submitApp from '@salesforce/apex/SubsidyApplicationService.submit';
import approveApp from '@salesforce/apex/SubsidyApplicationService.approve';
import rejectApp from '@salesforce/apex/SubsidyApplicationService.reject';
import assignPractitioner from '@salesforce/apex/SubsidyApplicationService.assignPractitioner';
import listPractitioners from '@salesforce/apex/SubsidyApplicationService.listPractitioners';

export default class ApplicationActions extends LightningElement {
    @api recordId;
    @track approvedAmount;
    @track rejectReason;
    @track selectedPractitioner;
    @track busy = false;
    @track practitionerOptions = [];
    wiredRecord;

    @wire(getRecord, { recordId: '$recordId', fields: [STATUS, APPROVED] })
    wiredFn(result) {
        this.wiredRecord = result;
    }

    @wire(listPractitioners)
    wiredPractitioners({ data }) {
        if (data) {
            this.practitionerOptions = data.map(c => ({ label: c.Name, value: c.Id }));
        }
    }

    get status() { return getFieldValue(this.wiredRecord?.data, STATUS); }
    get canSubmit() { return this.status === 'Draft'; }
    get canDecide() { return ['Submitted','Awaiting_Insurance_Check','Assessment'].includes(this.status); }
    get canAssign() { return ['Approved','Awaiting_Practitioner'].includes(this.status); }

    handleAmount(e) { this.approvedAmount = e.target.value; }
    handleReason(e) { this.rejectReason = e.target.value; }
    handlePractitioner(e) { this.selectedPractitioner = e.detail.value; }

    async run(fn, successMsg) {
        this.busy = true;
        try {
            await fn();
            this.toast('Success', successMsg, 'success');
            await refreshApex(this.wiredRecord);
        } catch (err) {
            this.toast('Error', err?.body?.message || err?.message || 'Operation failed', 'error');
        } finally {
            this.busy = false;
        }
    }

    doSubmit() { this.run(() => submitApp({ appId: this.recordId }), 'Application submitted'); }
    doApprove() {
        if (!this.approvedAmount) { this.toast('Missing', 'Enter approved amount', 'warning'); return; }
        this.run(() => approveApp({ appId: this.recordId, approvedAmount: parseFloat(this.approvedAmount) }), 'Application approved');
    }
    doReject() {
        if (!this.rejectReason) { this.toast('Missing', 'Enter rejection reason', 'warning'); return; }
        this.run(() => rejectApp({ appId: this.recordId, reason: this.rejectReason }), 'Application rejected');
    }
    doAssign() {
        if (!this.selectedPractitioner) { this.toast('Missing', 'Select a practitioner', 'warning'); return; }
        this.run(() => assignPractitioner({ appId: this.recordId, practitionerContactId: this.selectedPractitioner }), 'Practitioner assigned');
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
