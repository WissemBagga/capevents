import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';
import { PageResponse } from '../../../core/models/page-response.model';
import { RegistrationResponse } from '../../../core/models/registration.model';

import { getDefaultEventImage } from '../../../core/constants/event-image-presets';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

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

  currentUser = this.authService.getCurrentUserSnapshot();

  loading = false;
  errorMessage = '';
  events: EventResponse[] = [];
  totalItems = 0;
  registeredEventIds = new Set<string>();

  currentDateTime = new Date();
  private clockInterval: ReturnType<typeof setInterval> | null = null;

  get firstName(): string {
    return this.currentUser?.firstName || 'Utilisateur';
  }

  get departmentName(): string {
    return this.currentUser?.departmentName || 'Non défini';
  }

  ngOnInit(): void {
    this.loadUpcomingEvents();
    if (this.authService.hasEmployeeRole()) {
      this.loadRegisteredEvents();
    }
    // Update clock every minute
    this.clockInterval = setInterval(() => {
      this.currentDateTime = new Date();
      this.cdr.markForCheck();
    }, 60000);
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
    return event.imageUrl || getDefaultEventImage(event.category);
  }
}
