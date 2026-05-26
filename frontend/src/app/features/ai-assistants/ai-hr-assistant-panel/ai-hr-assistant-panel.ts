import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AiHrCopilotService } from '@core/services/ai-hr-copilot.service';
import {
  AiHrCopilotResponse,
  AiHrCopilotSuggestion
} from '@core/models/ai-hr-copilot.model';
import { InvitationReminderService } from '@core/services/invitation-reminder.service';
import { AiHrCopilotFeedbackService } from '@core/services/ai-hr-copilot-feedback.service';
import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

@Component({
  selector: 'app-ai-hr-assistant-panel',
  standalone: true,
  imports: [RouterLink, FormsModule, ScrollToMessageDirective],
  templateUrl: './ai-hr-assistant-panel.html',
  styleUrl: './ai-hr-assistant-panel.css'
})
export class AiHrAssistantPanel {
  private cdr = inject(ChangeDetectorRef);
  private aiHrCopilotService = inject(AiHrCopilotService);
  private invitationReminderService = inject(InvitationReminderService);
  private aiHrCopilotFeedbackService = inject(AiHrCopilotFeedbackService);

  aiCopilot: AiHrCopilotResponse | null = null;
  aiCopilotLoading = false;
  aiCopilotError = '';

  copiedCopilotSuggestionIndex: number | null = null;

  remindingEventId: string | null = null;
  copilotActionMessage = '';
  copilotActionError = '';

  selectedReminderSuggestion: AiHrCopilotSuggestion | null = null;
  reminderMessageDraft = '';

  copilotFeedbackLoadingKey: string | null = null;
  copilotFeedbackByKey: Record<string, boolean> = {};
  copilotFeedbackMessage = '';
  copilotFeedbackError = '';

  ngOnInit(): void {
    this.loadAiCopilot();
  }

  loadAiCopilot(): void {
    this.aiCopilotLoading = true;
    this.aiCopilotError = '';
    this.copilotActionMessage = '';
    this.copilotActionError = '';
    this.cdr.markForCheck();

    this.aiHrCopilotService.getSuggestions()
      .pipe(finalize(() => {
        this.aiCopilotLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (res) => {
          this.aiCopilot = res;
          this.cdr.markForCheck();
        },
        error: () => {
          this.aiCopilot = null;
          this.aiCopilotError = 'Impossible de charger lâ€™assistant RH.';
          this.cdr.markForCheck();
        }
      });
  }

  trackByCopilotSuggestion(index: number, item: AiHrCopilotSuggestion): string {
    return `${item.type}-${item.relatedEventId || index}`;
  }

  hasCopilotRelatedEvent(item: AiHrCopilotSuggestion): boolean {
    return !!item.relatedEventId;
  }

  copyCopilotDraft(draft: string | null, index: number): void {
    if (!draft?.trim()) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(draft).then(() => {
        this.markCopilotDraftCopied(index);
      }).catch(() => {
        this.copyTextFallback(draft, index);
      });

      return;
    }

    this.copyTextFallback(draft, index);
  }

  private copyTextFallback(text: string, index: number): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      document.execCommand('copy');
      this.markCopilotDraftCopied(index);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  private markCopilotDraftCopied(index: number): void {
    this.copiedCopilotSuggestionIndex = index;
    this.cdr.markForCheck();

    setTimeout(() => {
      if (this.copiedCopilotSuggestionIndex === index) {
        this.copiedCopilotSuggestionIndex = null;
        this.cdr.markForCheck();
      }
    }, 1800);
  }

  canSendInvitationReminder(suggestion: AiHrCopilotSuggestion): boolean {
    return (
      suggestion.actionType === 'REMIND_PENDING_INVITATIONS' &&
      !!suggestion.relatedEventId
    );
  }

  isReminderLoadingFor(suggestion: AiHrCopilotSuggestion): boolean {
    return !!suggestion.relatedEventId && this.remindingEventId === suggestion.relatedEventId;
  }

  openReminderConfirmation(suggestion: AiHrCopilotSuggestion): void {
    this.selectedReminderSuggestion = suggestion;
    this.reminderMessageDraft = suggestion.draft || this.buildDefaultReminderDraft(suggestion);
    this.copilotActionMessage = '';
    this.copilotActionError = '';
    this.cdr.markForCheck();
  }

  closeReminderConfirmation(): void {
    this.selectedReminderSuggestion = null;
    this.reminderMessageDraft = '';
    this.cdr.markForCheck();
  }

  confirmSendInvitationReminder(): void {
    const suggestion = this.selectedReminderSuggestion;

    if (!suggestion?.relatedEventId) return;

    this.remindingEventId = suggestion.relatedEventId;
    this.copilotActionMessage = '';
    this.copilotActionError = '';
    this.cdr.markForCheck();

    this.invitationReminderService
      .sendPendingInvitationReminders(
        suggestion.relatedEventId,
        this.reminderMessageDraft
      )
      .pipe(finalize(() => {
        this.remindingEventId = null;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.copilotActionMessage = response.message;
          this.closeReminderConfirmation();
          this.loadAiCopilot();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.copilotActionError =
            err?.error?.message ||
            err?.error ||
            'Impossible dâ€™envoyer les relances.';
          this.cdr.markForCheck();
        }
      });
  }

  private buildDefaultReminderDraft(suggestion: AiHrCopilotSuggestion): string {
    if (suggestion.relatedEventTitle) {
      return `Nous vous rappelons que vous avez une invitation en attente pour lâ€™Ã©vÃ©nement Â« ${suggestion.relatedEventTitle} Â». Votre rÃ©ponse nous aide Ã  mieux organiser la participation et la logistique de lâ€™Ã©vÃ©nement.`;
    }

    return 'Nous vous rappelons que vous avez une invitation en attente sur CapEvents. Votre rÃ©ponse nous aide Ã  mieux organiser la participation.';
  }

  getCopilotPrimaryActionLabel(suggestion: AiHrCopilotSuggestion): string {
    switch (suggestion.type) {
      case 'PENDING_INVITATIONS':
        return 'Voir les invitations';

      case 'LOW_REGISTRATION':
        return 'Analyser les inscriptions';

      case 'RSVP_FRICTION':
        return 'Analyser les rÃ©ponses';

      case 'LOW_FEEDBACK_SCORE':
        return 'Voir les feedbacks';

      case 'LOW_DEPARTMENT_ENGAGEMENT':
        return 'Voir le contexte';

      default:
        return 'Voir lâ€™Ã©vÃ©nement';
    }
  }

  getCopilotEventSection(suggestion: AiHrCopilotSuggestion): string {
    switch (suggestion.type) {
      case 'PENDING_INVITATIONS':
      case 'LOW_REGISTRATION':
      case 'RSVP_FRICTION':
        return 'invitations';

      case 'LOW_FEEDBACK_SCORE':
        return 'feedback';

      case 'LOW_DEPARTMENT_ENGAGEMENT':
      default:
        return 'overview';
    }
  }

  getCopilotEventQueryParams(suggestion: AiHrCopilotSuggestion): Record<string, string> {
    return {
      section: this.getCopilotEventSection(suggestion)
    };
  }

  getCopilotMetadataNumber(
    suggestion: AiHrCopilotSuggestion,
    key: string
  ): number | null {
    const value = suggestion.metadata?.[key];

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }

    return null;
  }

  getCopilotMetricChips(
    suggestion: AiHrCopilotSuggestion
  ): { label: string; value: string; type: string }[] {
    const chips: { label: string; value: string; type: string }[] = [];

    const registrationRate = this.getCopilotMetadataNumber(suggestion, 'registration_rate');
    const attendanceRate = this.getCopilotMetadataNumber(suggestion, 'attendance_rate');
    const feedbackScore = this.getCopilotMetadataNumber(suggestion, 'average_rating');
    const feedbackCount = this.getCopilotMetadataNumber(suggestion, 'feedback_count');
    const pendingInvitations = this.getCopilotMetadataNumber(suggestion, 'pending_invitations_count');
    const invitedCount = this.getCopilotMetadataNumber(suggestion, 'invited_count');
    const registeredCount = this.getCopilotMetadataNumber(suggestion, 'registered_count');
    const capacity = this.getCopilotMetadataNumber(suggestion, 'capacity');
    const responded = this.getCopilotMetadataNumber(suggestion, 'responded_count');
    const yes = this.getCopilotMetadataNumber(suggestion, 'yes_count');
    const maybe = this.getCopilotMetadataNumber(suggestion, 'maybe_count');
    const no = this.getCopilotMetadataNumber(suggestion, 'no_count');
    const frictionRate = this.getCopilotMetadataNumber(suggestion, 'friction_rate');

    if (registrationRate !== null) {
      chips.push({
        label: 'Inscription',
        value: `${Math.round(registrationRate * 100)}%`,
        type: registrationRate >= 0.5 ? 'success' : 'warning'
      });
    }

    if (attendanceRate !== null) {
      chips.push({
        label: 'PrÃ©sence',
        value: `${Math.round(attendanceRate * 100)}%`,
        type: attendanceRate >= 0.6 ? 'success' : 'warning'
      });
    }

    if (feedbackScore !== null) {
      chips.push({
        label: 'Note',
        value: `${feedbackScore.toFixed(1)}/5`,
        type: feedbackScore >= 4 ? 'success' : 'warning'
      });
    }

    if (feedbackCount !== null) {
      chips.push({
        label: 'Feedbacks',
        value: String(feedbackCount),
        type: 'neutral'
      });
    }

    if (pendingInvitations !== null) {
      chips.push({
        label: 'Invitations en attente',
        value: String(pendingInvitations),
        type: pendingInvitations > 0 ? 'warning' : 'success'
      });
    }

    if (invitedCount !== null) {
      chips.push({
        label: 'InvitÃ©s',
        value: String(invitedCount),
        type: 'neutral'
      });
    }

    if (registeredCount !== null) {
      chips.push({
        label: 'Inscrits',
        value: String(registeredCount),
        type: 'neutral'
      });
    }

    if (capacity !== null) {
      chips.push({
        label: 'CapacitÃ©',
        value: String(capacity),
        type: 'neutral'
      });
    }

    if (responded !== null) {
      chips.push({
        label: 'RÃ©ponses',
        value: String(responded),
        type: 'neutral'
      });
    }

    if (yes !== null) {
      chips.push({
        label: 'Oui',
        value: String(yes),
        type: 'success'
      });
    }

    if (maybe !== null) {
      chips.push({
        label: 'Peut-Ãªtre',
        value: String(maybe),
        type: 'warning'
      });
    }

    if (no !== null) {
      chips.push({
        label: 'Non',
        value: String(no),
        type: 'warning'
      });
    }

    if (frictionRate !== null) {
      chips.push({
        label: 'Friction',
        value: `${Math.round(frictionRate * 100)}%`,
        type: 'warning'
      });
    }

    return chips;
  }

  trackByCopilotChip(_: number, item: { label: string; value: string; type: string }): string {
    return `${item.label}-${item.value}`;
  }

  getCopilotSuggestionKey(suggestion: AiHrCopilotSuggestion): string {
    return `${suggestion.type}-${suggestion.relatedEventId || 'global'}`;
  }

  hasCopilotFeedback(suggestion: AiHrCopilotSuggestion): boolean {
    return this.copilotFeedbackByKey[this.getCopilotSuggestionKey(suggestion)] !== undefined;
  }

  isCopilotFeedbackLoading(suggestion: AiHrCopilotSuggestion): boolean {
    return this.copilotFeedbackLoadingKey === this.getCopilotSuggestionKey(suggestion);
  }

  submitCopilotFeedback(
    suggestion: AiHrCopilotSuggestion,
    useful: boolean
  ): void {
    if (!this.aiCopilot?.requestId) {
      this.copilotFeedbackError = 'Impossible dâ€™identifier la gÃ©nÃ©ration Assistant RH.';
      this.cdr.markForCheck();
      return;
    }

    const key = this.getCopilotSuggestionKey(suggestion);

    this.copilotFeedbackLoadingKey = key;
    this.copilotFeedbackMessage = '';
    this.copilotFeedbackError = '';
    this.cdr.markForCheck();

    this.aiHrCopilotFeedbackService.submitFeedback({
      requestId: this.aiCopilot.requestId,
      suggestionType: suggestion.type,
      relatedEventId: suggestion.relatedEventId,
      useful,
      comment: null
    })
      .pipe(finalize(() => {
        this.copilotFeedbackLoadingKey = null;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.copilotFeedbackByKey[key] = useful;
          this.copilotFeedbackMessage =
            response?.message || 'Merci, votre retour a Ã©tÃ© enregistrÃ©.';
          this.cdr.markForCheck();
        },
        error: () => {
          this.copilotFeedbackError =
            'Impossible dâ€™enregistrer votre retour sur cette suggestion.';
          this.cdr.markForCheck();
        }
      });
  }
}
