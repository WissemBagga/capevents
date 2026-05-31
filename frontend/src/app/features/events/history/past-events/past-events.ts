import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { EventService } from '@core/services/event.service';
import { UserService } from '@core/services/user.service';
import { Department } from '@core/models/department.model';
import { PastEventCardResponse } from '@core/models/feedback.model';
import { PageResponse } from '@core/models/page-response.model';
import { EVENT_CATEGORY_OPTIONS } from '@core/constants/event-categories';

import { resolveEventImageUrl } from '@core/constants/event-image-presets';
import { Pagination } from '@shared/components/pagination/pagination';

@Component({
  selector: 'app-past-events',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, FormsModule, Pagination, NgClass],
  templateUrl: './past-events.html',
  styleUrl: './past-events.css'
})
export class PastEvents {
  private eventService = inject(EventService);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);

  events: PastEventCardResponse[] = [];
  departments: Department[] = [];
  categoryOptions = EVENT_CATEGORY_OPTIONS;

  loading = false;
  errorMessage = '';

  currentPage = 0;
  pageSize = 9;
  totalPages = 1;
  totalItems = 0;

  filters = {
    category: '',
    departmentId: null as number | null,
    audience: '',
    q: ''
  };

  ngOnInit(): void {
    this.loadDepartments();
    this.loadEvents();
  }

  loadDepartments(): void {
    this.userService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments ?? [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.departments = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadEvents(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getPastEvents(this.currentPage, this.pageSize, this.filters)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (page: PageResponse<PastEventCardResponse>) => {
          this.events = (page.items ?? []).map(e => ({
            ...e,
            averageRating: e.averageRating || 0,
            feedbackCount: e.feedbackCount || 0,
            presentCount: e.presentCount || 0
          }));
          this.totalPages = page.totalPages || 1;
          this.totalItems = page.totalItems || 0;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.events = [];
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Une erreur est survenue lors du chargement des événements passés. Veuillez réessayer ultérieurement.';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadEvents();
  }

  resetFilters(): void {
    this.filters = {
      category: '',
      departmentId: null,
      audience: '',
      q: ''
    };
    this.currentPage = 0;
    this.loadEvents();
  }

  getEventImageUrl(event: PastEventCardResponse): string {
    return resolveEventImageUrl(event.imageUrl, event.category);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.loadEvents();
  }

  getRatingLabel(event: PastEventCardResponse): string {
    if (!event.averageRating) return 'Aucun avis';
    if (event.averageRating >= 4.5) return 'Très apprécié';
    if (event.averageRating >= 3.5) return 'Apprécié';
    if (event.averageRating >= 2.5) return 'Moyen';
    return 'À améliorer';
  }

  getCategoryClass(category: string | null): string {
    if (!category) return 'cat-default';
    const normalized = category.toLowerCase().trim();
    if (normalized.includes('team building')) return 'cat-teambuilding';
    if (normalized.includes('formation')) return 'cat-formation';
    if (normalized.includes('webinaire') || normalized.includes('conference')) return 'cat-webinaire';
    if (normalized.includes('rse')) return 'cat-rse';
    if (normalized.includes('innovation')) return 'cat-innovation';
    if (normalized.includes('atelier')) return 'cat-atelier';
    return 'cat-default';
  }

  hasFeedback(event: PastEventCardResponse): boolean {
    return event.feedbackCount > 0;
  }

  hasPresence(event: PastEventCardResponse): boolean {
    return event.presentCount > 0;
  }
}

