import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';
import { PageResponse } from '../../../core/models/page-response.model';
import { RegistrationResponse } from '../../../core/models/registration.model';

import { resolveEventImageUrl  } from '../../../core/constants/event-image-presets';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

import { AiRecommendationService } from '../../../core/services/ai-recommendation.service';
import { AiRecommendationItem } from '../../../core/models/ai-recommendation.model';
import { MyInvitationResponse, InvitationResponseStatus } from '../../../core/models/invitation.model';


@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, ScrollToMessageDirective],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css'
})
export class EmployeeDashboard implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);
  private aiRecommendationService = inject(AiRecommendationService);

  currentUser = this.authService.getCurrentUserSnapshot();

  loading = false;
  errorMessage = '';
  events: EventResponse[] = [];
  totalItems = 0;
  registeredEventIds = new Set<string>();

  currentDateTime = new Date();
  private clockInterval: ReturnType<typeof setInterval> | null = null;

  aiLoading = false;
  aiErrorMessage = '';
  aiRecommendations: AiRecommendationItem[] = [];

  invitations: MyInvitationResponse[] = [];
  invitationsLoading = false;
  responseLoadingById: Record<number, boolean> = {};
  topParticipants: any[] = [];

  get firstName(): string {
    return this.currentUser?.firstName || 'Utilisateur';
  }

  get departmentName(): string {
    return this.currentUser?.departmentName || 'Non défini';
  }


  ngOnInit(): void {
    this.loadUpcomingEvents();
    this.loadAiRecommendations();
    this.loadInvitations();
    if (this.authService.hasEmployeeRole()) {
      this.loadRegisteredEvents();
    }
    this.topParticipants = [
      { id: 1, name: 'Ahmed Belhadj', points: 1250, rank: 1, avatar: 'assets/images/avatars/avatar-1.png' },
      { id: 2, name: 'Fatima Zahra', points: 1100, rank: 2, avatar: 'assets/images/avatars/avatar-2.png' },
      { id: 3, name: 'Moi (' + this.firstName + ')', points: 950, rank: 3, avatar: this.currentUser?.avatarUrl || 'assets/images/avatars/avatar-3.png', isMe: true },
      { id: 4, name: 'Sami Mansour', points: 800, rank: 4, avatar: 'assets/images/avatars/avatar-4.png' }
    ];
    // Update clock every minute
    this.clockInterval = setInterval(() => {
      this.currentDateTime = new Date();
      this.cdr.markForCheck();
    }, 60000);
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  loadInvitations(): void {
    this.invitationsLoading = true;
    this.cdr.markForCheck();

    this.eventService.getMyInvitations()
      .pipe(finalize(() => {
        this.invitationsLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (invitations) => {
          this.invitations = invitations ?? [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.invitations = [];
          this.cdr.markForCheck();
        }
      });
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
        }
      });
  }

  get pendingInvitations(): MyInvitationResponse[] {
    return this.invitations.filter(i => !i.rsvpResponse || i.rsvpResponse as any === 'PENDING');
  }

  get pendingInvitationsCount(): number {
    return this.pendingInvitations.length;
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  isFull(event: EventResponse): boolean {
    return event.remainingCapacity === 0;
  }

  isRegistered(event: EventResponse): boolean {
    return this.registeredEventIds.has(event.id);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'DRAFT': return 'Brouillon';
      case 'PUBLISHED': return 'Publié';
      case 'CANCELLED': return 'Annulé';
      case 'ARCHIVED': return 'Archivé';
      case 'PENDING': return 'En attente';
      default: return status;
    }
  }

  loadUpcomingEvents(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getPublished(0, 3, 'startAt', 'asc')
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response: PageResponse<EventResponse>) => {
          this.events = response.items;
          this.totalItems = response.totalItems;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger les événements.';
          this.cdr.markForCheck();
        }
      });
  }

  private loadRegisteredEvents(): void {
    this.eventService.getMyRegistrations().subscribe({
      next: (items: RegistrationResponse[]) => {
        this.registeredEventIds = new Set(items.map(item => item.eventId));
        this.cdr.markForCheck();
      },
      error: () => {
        this.registeredEventIds = new Set();
        this.cdr.markForCheck();
      }
    });
  }

  isDeadlinePassed(event: EventResponse): boolean {
    if (!event.registrationDeadline) return false;
    return new Date().getTime() > new Date(event.registrationDeadline).getTime();
  }

  getParticipantAvatars(event: EventResponse): string[] {
    return (event.participantAvatarUrls ?? []).filter(Boolean).slice(0, 3);
  }

  getRemainingParticipantCount(event: EventResponse): number {
    const total = event.registeredCount ?? 0;
    const shown = this.getParticipantAvatars(event).length;
    return Math.max(total - shown, 0);
  }

  hasParticipants(event: EventResponse): boolean {
    return (event.registeredCount ?? 0) > 0;
  }

  getEventImageUrl(event: EventResponse): string {
    return resolveEventImageUrl(event.imageUrl, event.category);
  }

  private loadAiRecommendations(): void {
    const userId = this.currentUser?.id;

    if (!userId) {
      this.aiRecommendations = [];
      this.aiErrorMessage = 'Utilisateur connecté introuvable.';
      return;
    }

    this.aiLoading = true;
    this.aiErrorMessage = '';
    this.cdr.markForCheck();

    this.aiRecommendationService.getRecommendationsForUser(userId, 6)
      .pipe(finalize(() => {
        this.aiLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.aiRecommendations = response.items ?? [];

          if (!this.aiRecommendations.length && response.message) {
            this.aiErrorMessage = response.message;
          }

          this.cdr.markForCheck();
        },
        error: () => {
          this.aiRecommendations = [];
          this.aiErrorMessage = 'Impossible de charger les recommandations IA.';
          this.cdr.markForCheck();
        }
      });
  }

  getRecommendationImageUrl(item: AiRecommendationItem): string {
    return resolveEventImageUrl(null, item.category || undefined);
  }

  getAiScorePercent(score: number): number {
    const normalized = 1 / (1 + Math.exp(-score));
    return Math.round(normalized * 100);
  }

  getRecommendationDateLabel(item: AiRecommendationItem): string {
    return item.startAt || '';
  }
}
