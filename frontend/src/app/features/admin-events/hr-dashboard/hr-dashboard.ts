import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';
import { PageResponse } from '../../../core/models/page-response.model';

@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './hr-dashboard.html',
  styleUrl: './hr-dashboard.css'
})
export class HrDashboard {
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  events: EventResponse[] = [];
  loading = false;
  actionLoading = false;
  errorMessage = '';

  currentPage = 0;
  pageSize = 8;
  totalPages = 0;
  totalItems = 0;
  hasNext = false;
  hasPrevious = false;

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(page = 0): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getHrAdminEvents(page, this.pageSize)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response: PageResponse<EventResponse>) => {
          this.events = response.items;
          this.currentPage = response.currentPage;
          this.pageSize = response.pageSize;
          this.totalPages = response.totalPages;
          this.totalItems = response.totalItems;
          this.hasNext = response.hasNext;
          this.hasPrevious = response.hasPrevious;
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

  previousPage(): void {
    if (this.hasPrevious) {
      this.loadEvents(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.hasNext) {
      this.loadEvents(this.currentPage + 1);
    }
  }

  goToEdit(eventId: string): void {
    this.router.navigate(['/admin/edit-event', eventId]);
  }

  private isBeforeStart(event: EventResponse): boolean {
    return new Date(event.startAt).getTime() > Date.now();
  }

  private isAfterStart(event: EventResponse): boolean {
    return new Date(event.startAt).getTime() <= Date.now();
  }

  canEdit(event: EventResponse): boolean {
    return event.status === 'DRAFT' || event.status === 'PUBLISHED';
  }

  canPublish(event: EventResponse): boolean {
    return event.status === 'DRAFT';
  }

  canCancel(event: EventResponse): boolean {
    return (event.status === 'DRAFT' || event.status === 'PUBLISHED') && this.isBeforeStart(event);
  }

  canArchive(event: EventResponse): boolean {
    return (event.status === 'DRAFT' || event.status === 'PUBLISHED') && this.isAfterStart(event);
  }

  publish(eventId: string): void {
    this.actionLoading = true;
    this.cdr.markForCheck();

    this.eventService.publishEvent(eventId)
      .pipe(finalize(() => {
        this.actionLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => this.loadEvents(this.currentPage),
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de publier cet événement.';
          this.cdr.markForCheck();
        }
      });
  }

  archive(eventId: string): void {
    this.actionLoading = true;
    this.cdr.markForCheck();

    this.eventService.archiveEvent(eventId)
      .pipe(finalize(() => {
        this.actionLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => this.loadEvents(this.currentPage),
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible d’archiver cet événement.';
          this.cdr.markForCheck();
        }
      });
  }

  cancel(eventId: string): void {
    const reason = window.prompt('Entrez la raison de l’annulation :');

    if (!reason || !reason.trim()) {
      return;
    }

    this.actionLoading = true;
    this.cdr.markForCheck();

    this.eventService.cancelEvent(eventId, reason.trim())
      .pipe(finalize(() => {
        this.actionLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => this.loadEvents(this.currentPage),
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible d’annuler cet événement.';
          this.cdr.markForCheck();
        }
      });
  }

   statusLabel(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'Brouillon';
      case 'PUBLISHED':
        return 'Publié';
      case 'CANCELLED':
        return 'Annulé';
      case 'ARCHIVED':
        return 'Archivé';
      case 'PENDING':
        return 'En attente';
      default:
        return status;
    }
  }
}