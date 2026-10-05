import { LightningElement, api, track } from 'lwc';
import saveStep from '@salesforce/apex/OnboardingWizardController.saveStep';
import completeOnboarding from '@salesforce/apex/OnboardingWizardController.completeOnboarding';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const STEPS = ['Identity', 'Address', 'Language', 'Insurance', 'Summary'];

const LANGUAGES = [
    { label: 'English (US)', value: 'en_US' },
    { label: 'French',       value: 'fr' },
    { label: 'German',       value: 'de' },
    { label: 'Chinese',      value: 'zh_CN' },
    { label: 'Japanese',     value: 'ja' }
];

export default class OnboardingWizard extends LightningElement {
    @api contactId;
    @track currentIndex = 0;
    @track prefillPending = false;
    @track data = {
        firstName: '', lastName: '', dob: '',
        street: '', city: '', country: '',
        language: 'en_US',
        insurerName: '', policyNumber: ''
    };

    get currentStep() { return STEPS[this.currentIndex]; }
    get isIdentity()  { return this.currentStep === 'Identity';  }
    get isAddress()   { return this.currentStep === 'Address';   }
    get isLanguage()  { return this.currentStep === 'Language';  }
    get isInsurance() { return this.currentStep === 'Insurance'; }
    get isSummary()   { return this.currentStep === 'Summary';   }
    get isFirst()     { return this.currentIndex === 0; }
    get isLast()      { return this.currentIndex === STEPS.length - 1; }
    get progressPct() { return Math.round((this.currentIndex / (STEPS.length - 1)) * 100); }
    get languageOptions() { return LANGUAGES; }
    get summaryJson() { return JSON.stringify(this.data, null, 2); }

    handleChange(evt) {
        this.data = { ...this.data, [evt.target.name]: evt.target.value };
    }

    async next() {
        if (!this.contactId) {
            this.toast('error', 'Missing contactId', 'Set the contactId property on this component.');
            return;
        }
        try {
            await saveStep({
                contactId: this.contactId,
                step: this.currentStep,
                payloadJson: JSON.stringify(this.data)
            });
            if (this.currentIndex === 0) {
                this.prefillPending = true;
                setTimeout(() => { this.prefillPending = false; }, 2000);
            }
            if (!this.isLast) this.currentIndex += 1;
        } catch (e) {
            this.toast('error', 'Save failed', e?.body?.message || e.message);
        }
    }

    back() { if (!this.isFirst) this.currentIndex -= 1; }

    async submit() {
        try {
            await saveStep({
                contactId: this.contactId,
                step: 'Summary',
                payloadJson: JSON.stringify(this.data)
            });
            await completeOnboarding({ contactId: this.contactId, language: this.data.language });
            this.toast('success', 'Welcome!', 'Onboarding complete — welcome email on its way.');
        } catch (e) {
            this.toast('error', 'Submit failed', e?.body?.message || e.message);
        }
    }

    toast(variant, title, message) {
        this.dispatchEvent(new ShowToastEvent({ variant, title, message }));
    }
}
