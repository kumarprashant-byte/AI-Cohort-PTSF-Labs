import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToast';
import getFaqs from '@salesforce/apex/AssessorFaqController.getFaqs';
import createChatCase from '@salesforce/apex/AssessorFaqController.createChatCase';
import postReply from '@salesforce/apex/AssessorFaqController.postReply';
import getReplies from '@salesforce/apex/AssessorFaqController.getReplies';

const PHI_STEMS = ['diagnos', 'medic', 'allerg', 'condition', 'illness', 'symptom'];

export default class FaqChatPanel extends LightningElement {
    @wire(getFaqs) faqs;

    @track questionDraft = '';
    @track replyDraft = '';
    @track inlineMatch;
    @track noMatchNote = false;
    @track activeCaseId;
    @track phiNotice = false;
    @track chatInFlight = false;
    @track replies = [];

    handleQuestionChange(e) { this.questionDraft = e.target.value || ''; }
    handleReplyChange(e) { this.replyDraft = e.target.value || ''; }

    handleCheckFaq() {
        this.inlineMatch = null;
        this.noMatchNote = false;
        const q = (this.questionDraft || '').toLowerCase().trim();
        if (!q || !this.faqs.data) return;

        for (const faq of this.faqs.data) {
            const phrases = (faq.Trigger_Phrases__c || '').toLowerCase().split(';');
            for (const p of phrases) {
                const token = p.trim();
                if (token && q.includes(token)) {
                    this.inlineMatch = faq;
                    return;
                }
            }
        }
        this.noMatchNote = true;
    }

    async handleChatClick() {
        const q = (this.questionDraft || '').trim();
        if (!q) {
            this.toast('A question is required.', 'error');
            return;
        }
        this.chatInFlight = true;
        try {
            const caseId = await createChatCase({ question: q });
            this.activeCaseId = caseId;
            this.phiNotice = PHI_STEMS.some(s => q.toLowerCase().includes(s));
            this.inlineMatch = null;
            this.noMatchNote = false;
            await this.refreshReplies();
            this.toast('Chat opened with an Assessor.', 'success');
        } catch (e) {
            this.toast('Could not open chat: ' + (e.body ? e.body.message : e.message), 'error');
        } finally {
            this.chatInFlight = false;
        }
    }

    async handleReplySubmit() {
        if (!this.activeCaseId || !this.replyDraft.trim()) return;
        try {
            await postReply({ caseId: this.activeCaseId, message: this.replyDraft.trim() });
            this.replyDraft = '';
            await this.refreshReplies();
        } catch (e) {
            this.toast('Reply failed: ' + (e.body ? e.body.message : e.message), 'error');
        }
    }

    async refreshReplies() {
        if (!this.activeCaseId) return;
        try {
            this.replies = await getReplies({ caseId: this.activeCaseId });
        } catch (e) {
            // non-fatal
            this.replies = [];
        }
    }

    toast(message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title: 'FAQ Chat', message, variant }));
    }
}
