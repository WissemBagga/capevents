import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { MyInvitationReminderService } from '../../../core/services/my-invitation-reminder.service';

import {
  MyInvitationResponse,
  InvitationResponseStatus
} from '../../../core/models/invitation.model';

import { MyInvitationReminder } from '../../../core/models/my-invitation-reminder.model';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

@Component({
  selector: 'app-my-invitations',
  standalone: true,
  imports: [DatePipe, RouterLink, ScrollToMessageDirective],
  templateUrl: './my-invitations.html',
  styleUrl: './my-invitations.css',
})
export class MyInvitations implements OnInit {
  private eventService = inject(EventService);
  private myInvitationReminderService = inject(MyInvitationReminderService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  invitations: MyInvitationResponse[] = [];
  loading = false;
  errorMessage = '';

  responseLoadingById: Record<number, boolean> = {};

  selectedReminderInvitationId: number | null = null;
  selectedReminderHistory: MyInvitationReminder[] = [];
  reminderHistoryLoading = false;
  reminderHistoryError = '';

  ngOnInit(): void {
    this.loadInvitations();
  }

  private loadInvitations(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getMyInvitations()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (invitations) => {
          this.invitations = invitations ?? [];
          this.openInvitationFromNotificationIfNeeded();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger vos invitations.';
          this.cdr.markForCheck();
        }
      });
  }

  private openInvitationFromNotificationIfNeeded(): void {
    const invitationIdParam = this.route.snapshot.queryParamMap.get('invitationId');

    if (!invitationIdParam) return;

    const invitationId = Number(invitationIdParam);

    if (!Number.isFinite(invitationId)) return;

    const exists = this.invitations.some(
      invitation => invitation.invitationId === invitationId
    );

    if (exists) {
      this.openReminderHistory(invitationId);
    }
  }

  respond(invitationId: number, response: InvitationResponseStatus): void {
    this.responseLoadingById[invitationId] = true;
    this.cdr.markForCheck();

    this.eventService.respondToInvitation(invitationId, response)
      .pipe(finalize(() => {
        this.responseLoadingById[invitationId] = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.invitations = this.invitations.map(invitation =>
            invitation.invitationId === invitationId
              ? { ...invitation, rsvpResponse: response }
              : invitation
          );

          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible d’enregistrer votre réponse.';
          this.cdr.markForCheck();
        }
      });
  }

  openReminderHistory(invitationId: number): void {
    this.selectedReminderInvitationId = invitationId;
    this.selectedReminderHistory = [];
    this.reminderHistoryLoading = true;
    this.reminderHistoryError = '';
    this.cdr.markForCheck();

    this.myInvitationReminderService.getReminderHistory(invitationId)
      .pipe(finalize(() => {
        this.reminderHistoryLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (items) => {
          this.selectedReminderHistory = items ?? [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.selectedReminderHistory = [];
          this.reminderHistoryError = 'Impossible de charger les messages de relance.';
          this.cdr.markForCheck();
        }
      });
  }

  closeReminderHistory(): void {
    this.selectedReminderInvitationId = null;
    this.selectedReminderHistory = [];
    this.reminderHistoryError = '';
    this.cdr.markForCheck();
  }

  targetTypeLabel(targetType: string): string {
    switch (targetType) {
      case 'GLOBAL':
        return 'Globale';
      case 'DEPARTMENT':
        return 'Département';
      case 'INDIVIDUAL':
        return 'Individuelle';
      default:
        return targetType;
    }
  }

  invitationSourceLabel(source: 'ADMIN' | 'COLLEAGUE'): string {
    return source === 'ADMIN' ? 'Administration' : 'Collègue';
  }

  hasResponse(invitation: MyInvitationResponse): boolean {
    return invitation.rsvpResponse === 'YES'
      || invitation.rsvpResponse === 'MAYBE'
      || invitation.rsvpResponse === 'NO';
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'RESPONDED':
        return 'Répondue';
      case 'EXPIRED':
        return 'Expirée';
      default:
        return status;
    }
  }

  canShowReminderMessages(invitation: MyInvitationResponse): boolean {
    return (invitation.reminderCount ?? 0) > 0;
  }

  selectedInvitationTitle(): string {
    const invitation = this.invitations.find(
      item => item.invitationId === this.selectedReminderInvitationId
    );

    return invitation?.eventTitle ?? 'Invitation';
  }

  reminderChannelLabel(channel: string): string {
    switch (channel) {
      case 'EMAIL':
        return 'Email + notification';
      case 'SYSTEM':
        return 'Notification interne';
      default:
        return channel || 'Notification';
    }
  }

  reminderStatusLabel(status: string): string {
    switch (status) {
      case 'SENT':
        return 'Envoyée';
      case 'FAILED':
        return 'Échec';
      default:
        return status || 'N/D';
    }
  }

  reminderStatusClass(status: string): string {
    switch (status) {
      case 'SENT':
        return 'sent';
      case 'FAILED':
        return 'failed';
      default:
        return 'neutral';
    }
  }

  trackByInvitation(_: number, invitation: MyInvitationResponse): number {
    return invitation.invitationId;
  }

  trackByReminder(_: number, item: MyInvitationReminder): number {
    return item.id;
  }

  reminderCountLabel(invitation: MyInvitationResponse): string {
    const count = invitation.reminderCount ?? 0;

    if (count <= 1) {
      return '1 message de relance';
    }

    return `${count} messages de relance`;
  }
}