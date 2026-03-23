import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';
import { PageResponse } from '../../../core/models/page-response.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './events-list.html',
  styleUrl: './events-list.css'
})
export class EventsList {
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);
  private normalizeSearchText(value: string): string | null {
    if (!value || !value.trim()) return null;
    return value.trim();
  }



  events: EventResponse[] = [];
  loading = false;
  errorMessage = '';

  category = '';
  from = '';
  to = '';

  currentPage = 0;
  pageSize = 6;
  totalPages = 0;
  totalItems = 0;
  hasNext = false;
  hasPrevious = false;

  ngOnInit(): void {
    this.loadEvents();
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

  loadEvents(page = 0): void {

    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getPublished(page, this.pageSize)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response: PageResponse<EventResponse>) => {
          this.applyPage(response);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('loadEvents error', err);
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger les événements.';
          this.cdr.markForCheck();
        }
      });
  }

  search(): void {

    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.searchPublished(
      this.normalizeSearchText(this.category),
      this.toIsoInstant(this.from),
      this.toIsoInstant(this.to),
      0,
      this.pageSize
    )
    .pipe(finalize(() => {
      this.loading = false;
      this.cdr.markForCheck();
    }))
    .subscribe({
      next: (response: PageResponse<EventResponse>) => {
        this.applyPage(response);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('search error', err);
        this.errorMessage =
          err?.error?.message ||
          err?.error ||
          'Impossible de filtrer les événements.';
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

  resetFilters(): void {
    this.category = '';
    this.from = '';
    this.to = '';
    this.loadEvents(0);
  }

  private applyPage(response: PageResponse<EventResponse>): void {
    this.events = response.items;
    this.currentPage = response.currentPage;
    this.pageSize = response.pageSize;
    this.totalPages = response.totalPages;
    this.totalItems = response.totalItems;
    this.hasNext = response.hasNext;
    this.hasPrevious = response.hasPrevious;
  }


  private toIsoInstant(value: string): string | null {
    if (!value) return null;

    const date = new Date(value);
    if (isNaN(date.getTime())) return null;

    return date.toISOString();
}
}
