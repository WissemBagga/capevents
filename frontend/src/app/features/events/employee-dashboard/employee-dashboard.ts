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


import { PointService } from '../../../core/services/point.service';

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
  private pointService = inject(PointService);

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
    this.pointService.getLeaderboard()
      .subscribe({
        next: (response) => {
          if (!response || !response.topParticipants) {
            this.topParticipants = [];
            this.cdr.markForCheck();
            return;
          }

          const top3 = response.topParticipants.map((p: any) => ({
            id: p.userId,
            name: p.isCurrentUser ? p.displayName : `${p.firstName} ${p.lastName}`,
            points: p.points,
            rank: p.rank,
            avatar: p.avatarUrl,
            isMe: p.isCurrentUser
          }));

          const isMeInTop3 = top3.some((p: any) => p.isMe);

          if (isMeInTop3) {
            this.topParticipants = top3;
          } else if (response.currentUserRank) {
            const cur = response.currentUserRank;
            const myRow = {
              id: cur.userId,
              name: cur.displayName,
              points: cur.points,
              rank: cur.rank,
              avatar: cur.avatarUrl,
              isMe: true
            };
            this.topParticipants = [...top3, myRow];
          } else {
            this.topParticipants = top3;
          }

          this.cdr.markForCheck();
        },
        error: () => {
          this.topParticipants = [
            { id: 1, name: 'Marc Dubois', points: 2460, rank: 1, avatar: 'assets/images/avatars/avatar-1.png' },
            { id: 2, name: 'Julie Lambert', points: 2185, rank: 2, avatar: 'assets/images/avatars/avatar-2.png' },
            { id: 3, name: 'Sami Ben Ali', points: 1980, rank: 3, avatar: 'assets/images/avatars/avatar-3.png' },
            { id: 4, name: 'Moi (' + this.firstName + ')', points: 0, rank: 4, avatar: this.currentUser?.avatarUrl || '', isMe: true }
          ];
          this.cdr.markForCheck();
        }
      });

    this.clockInterval = setInterval(() => {
      this.currentDateTime = new Date();
      this.cdr.markForCheck();
    }, 60000);
  }

  formatPoints(pts: number | undefined | null): string {
    if (pts == null) return '0 pts';
    return `${pts.toLocaleString('en-US')} pts`;
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
