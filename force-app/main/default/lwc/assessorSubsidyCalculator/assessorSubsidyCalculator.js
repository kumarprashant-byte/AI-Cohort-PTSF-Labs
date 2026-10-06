import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import recalculate from '@salesforce/apex/AssessorSubsidyController.recalculate';

export default class AssessorSubsidyCalculator extends LightningElement {
    @api recordId;

    inFlight = false;
    result;
    error;

    get hasResult() {
        return this.result != null;
    }

    async handleRecalculate() {
        this.inFlight = true;
        this.error = null;
        try {
            this.result = await recalculate({ applicationId: this.recordId });
            this.dispatchEvent(new ShowToastEvent({
                title: 'Proposed amount updated',
                message: this.result.basis,
                variant: 'success'
            }));
        } catch (err) {
            this.result = null;
            this.error = (err && err.body && err.body.message) || 'Recalculation failed.';
            this.dispatchEvent(new ShowToastEvent({
                title: 'Recalculation failed',
                message: this.error,
                variant: 'error'
            }));
        } finally {
            this.inFlight = false;
        }
    }
}
