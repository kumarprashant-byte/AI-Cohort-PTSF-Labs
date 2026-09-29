import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getFormSchema from '@salesforce/apex/AssessmentFormController.getFormSchema';
import saveDraft from '@salesforce/apex/AssessmentFormController.saveDraft';
import submitAssessment from '@salesforce/apex/AssessmentFormController.submitAssessment';

export default class AssessmentForm extends LightningElement {
    @api recordId; // Assignment__c Id when embedded on Assignment record page
    @track fields = [];
    @track values = {};
    @track status = 'Draft';
    assessmentId;
    treatmentType;

    @wire(getFormSchema, { assignmentId: '$recordId' })
    wired({ data, error }) {
        if (data) {
            this.treatmentType = data.treatmentType;
            try {
                this.fields = JSON.parse(data.schemaJson || '[]');
            } catch (e) {
                this.fields = [];
            }
            if (data.existingAssessment) {
                this.assessmentId = data.existingAssessment.Id;
                this.status = data.existingAssessment.Status__c;
                try {
                    this.values = JSON.parse(data.existingAssessment.Response_JSON__c || '{}');
                } catch (e) {
                    this.values = {};
                }
            }
        } else if (error) {
            this.toast('Error', this.errMsg(error), 'error');
        }
    }

    get uploadContext() {
        return this.assessmentId;
    }

    get canUploadFiles() {
        return !!this.assessmentId;
    }

    get statusLabel() {
        return `Status: ${this.status}`;
    }

    handleInput(event) {
        const name = event.target.dataset.name;
        const type = event.target.dataset.type;
        const value = type === 'checkbox' ? event.target.checked : event.target.value;
        this.values = { ...this.values, [name]: value };
    }

    async handleSaveDraft() {
        try {
            this.assessmentId = await saveDraft({
                assignmentId: this.recordId,
                responseJson: JSON.stringify(this.values)
            });
            this.status = 'Draft';
            this.toast('Saved', 'Draft saved.', 'success');
        } catch (e) {
            this.toast('Save failed', this.errMsg(e), 'error');
        }
    }

    async handleSubmit() {
        const missing = this.fields.filter(f => f.required && !this.values[f.api_name] && this.values[f.api_name] !== 0);
        if (missing.length) {
            this.toast('Missing required', missing.map(f => f.label).join(', '), 'warning');
            return;
        }
        try {
            this.assessmentId = await submitAssessment({
                assignmentId: this.recordId,
                responseJson: JSON.stringify(this.values)
            });
            this.status = 'Pending Review';
            this.toast('Submitted', 'Assessment submitted for review.', 'success');
        } catch (e) {
            this.toast('Submit failed', this.errMsg(e), 'error');
        }
    }

    handleUploadFinished() {
        this.toast('Files uploaded', 'Attachments linked to this assessment.', 'success');
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    errMsg(e) {
        return (e && e.body && e.body.message) || (e && e.message) || 'Unknown error';
    }

    // Field-type discriminators for the template
    get fieldsForRender() {
        return this.fields.map(f => ({
            ...f,
            value: this.values[f.api_name],
            isText: f.type === 'text',
            isTextarea: f.type === 'textarea',
            isNumber: f.type === 'number',
            isDate: f.type === 'date',
            isCheckbox: f.type === 'checkbox',
            isPicklist: f.type === 'picklist',
            optionList: (f.options || []).map(o => ({ label: o, value: o }))
        }));
    }
}
