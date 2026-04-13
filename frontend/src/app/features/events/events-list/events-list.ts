import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/services/auth.service';
import { EventResponse } from '../../../core/models/event.model';
import { PageResponse } from '../../../core/models/page-response.model';
import { RegistrationResponse } from '../../../core/models/registration.model';
import { EVENT_CATEGORY_OPTIONS } from '../../../core/constants/event-categories';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './events-list.html',
  styleUrl: './events-list.css'
})
export class EventsList {
  private eventService = inject(EventService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  readonly categoryOptions = EVENT_CATEGORY_OPTIONS;

  events: EventResponse[] = [];
  registeredEventIds = new Set<string>();

  loading = false;
  errorMessage = '';

  category = '';
  from = '';
  to = '';
  sortBy = 'DATE_ASC';
  viewMode: 'grid' | 'list' = 'grid';
  titleQuery = '';

  currentPage = 0;
  pageSize = 6;
  totalPages = 0;
  totalItems = 0;
  hasNext = false;
  hasPrevious = false;

  statusFilter: 'ALL' | 'AVAILABLE' | 'FULL' | 'DEADLINE_PASSED' = 'ALL';


  ngOnInit(): void {
    this.fetchEvents(0);

    if (this.authService.hasEmployeeRole()) {
      this.loadRegisteredEvents();
    }
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

  isRegistered(event: EventResponse): boolean {
    return this.registeredEventIds.has(event.id);
  }

  isFull(event: EventResponse): boolean {
    return event.remainingCapacity === 0;
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

  search(): void {
    this.fetchEvents(0);
  }

  previousPage(): void {
    if (this.hasPrevious) {
      this.fetchEvents(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.hasNext) {
      this.fetchEvents(this.currentPage + 1);
    }
  }

  resetFilters(): void {
    this.category = '';
    this.from = '';
    this.to = '';
    this.sortBy = 'DATE_ASC';
    this.viewMode = 'grid';
    this.titleQuery = '';
    this.statusFilter = 'ALL';
    this.fetchEvents(0);
  }


  isDeadlinePassed(event: EventResponse): boolean {
    if (!event.registrationDeadline) return false;
    return new Date().getTime() > new Date(event.registrationDeadline).getTime();
  }

  matchesStatusFilter(event: EventResponse): boolean {
    switch (this.statusFilter) {
      case 'AVAILABLE':
        return !this.isDeadlinePassed(event) && !this.isFull(event);
      case 'FULL':
        return !this.isDeadlinePassed(event) && this.isFull(event);
      case 'DEADLINE_PASSED':
        return this.isDeadlinePassed(event);
      case 'ALL':
      default:
        return true;
    }
  }

  get displayedEvents(): EventResponse[] {
    return this.events.filter(event => this.matchesStatusFilter(event));
  }

  private fetchEvents(page = 0): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const { sortBy, sortDir } = this.mapSort();

    const hasFilters = !!this.category || !!this.from || !!this.to || !!this.titleQuery?.trim();

    const request$ = hasFilters
      ? this.eventService.searchPublished(
        this.normalizeSearchText(this.category),
        this.normalizeSearchText(this.titleQuery),
        this.toIsoInstant(this.from),
        this.toIsoInstant(this.to),
        page,
        this.pageSize,
        sortBy,
        sortDir
      )
      : this.eventService.getPublished(
          page,
          this.pageSize,
          sortBy,
          sortDir
        );

    request$
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
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger les événements.';
          this.cdr.markForCheck();
        }
      });
  }

  private mapSort(): { sortBy: string; sortDir: 'asc' | 'desc' } {
    switch (this.sortBy) {
      case 'DATE_DESC':
        return { sortBy: 'startAt', sortDir: 'desc' };
      case 'TITLE_ASC':
        return { sortBy: 'title', sortDir: 'asc' };
      case 'TITLE_DESC':
        return { sortBy: 'title', sortDir: 'desc' };
      case 'DATE_ASC':
      default:
        return { sortBy: 'startAt', sortDir: 'asc' };
    }
  }

  private normalizeSearchText(value: string): string | null {
    if (!value || !value.trim()) return null;
    return value.trim();
  }

  private applyPage(response: PageResponse<EventResponse>): void {
    this.events = response.items ?? [];
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