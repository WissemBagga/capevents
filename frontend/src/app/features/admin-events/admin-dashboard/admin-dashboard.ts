import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';
import { PageResponse } from '../../../core/models/page-response.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  events: EventResponse[] = [];
  filteredEvents: EventResponse[] = [];
  pagedEvents: EventResponse[] = [];
  selectedStatus= 'ALL';

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

  loadEvents(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getHrAdminEvents(0, 1000, 'createdAt', 'desc')
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response: PageResponse<EventResponse>) => {
          this.events = response.items ?? [];
          this.currentPage = 0 ;
          this.applyStatusFilter();
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

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      'DRAFT': 'Brouillon',
      'PUBLISHED': 'Publié',
      'CANCELLED': 'Annulé',
      'ARCHIVED': 'Archivé',
      'PENDING': 'En attente'
    };
    return labels[status] || status;
  }

  onStatusChange(): void {
    this.currentPage = 0;
    this.applyStatusFilter();
    this.cdr.markForCheck();
  }

  private applyStatusFilter(): void {
    if (this.selectedStatus === 'ALL') {
      this.filteredEvents = [...this.events];
    } else {
      this.filteredEvents = this.events.filter(e => e.status === this.selectedStatus);
    }

    this.totalItems = this.filteredEvents.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));

    if (this.totalItems === 0) {
      this.currentPage = 0;
    } else if (this.currentPage >= this.totalPages) {
      this.currentPage = this.totalPages - 1;
    }
    this.updatePagedEvents();
  }

  private updatePagedEvents(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.pagedEvents = this.filteredEvents.slice(start, end);
    this.hasPrevious = this.currentPage > 0;
    this.hasNext = this.currentPage + 1 < this.totalPages;
  }

  previousPage(): void {
    if (!this.hasPrevious) return;
    this.currentPage--;
    this.updatePagedEvents();
    this.cdr.markForCheck();
  }

  nextPage(): void {
    if (!this.hasNext) return;
    this.currentPage++;
    this.updatePagedEvents();
    this.cdr.markForCheck();
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
    if (!window.confirm('Voulez-vous vraiment publier cet événement ?')) {
      return;
    }
    this.actionLoading = true;
    this.cdr.markForCheck();

    this.eventService.publishEvent(eventId)
      .pipe(finalize(() => {
        this.actionLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => this.loadEvents(),
        error: (err) => {
          this.errorMessage = err?.error?.message || err?.error || 'Impossible de publier cet événement.';
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
        next: () => this.loadEvents(),
        error: (err) => {
          this.errorMessage = err?.error?.message || err?.error || 'Impossible d’archiver cet événement.';
          this.cdr.markForCheck();
        }
      });
  }

  cancel(eventId: string): void {
    const reason = window.prompt('Entrez la raison de l’annulation :');
    if (!reason || !reason.trim()) return;

    this.actionLoading = true;
    this.cdr.markForCheck();

    this.eventService.cancelEvent(eventId, reason.trim())
      .pipe(finalize(() => {
        this.actionLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => this.loadEvents(),
        error: (err) => {
          this.errorMessage = err?.error?.message || err?.error || 'Impossible d’annuler cet événement.';
          this.cdr.markForCheck();
        }
      });
  }
}
