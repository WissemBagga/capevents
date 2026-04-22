import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { UserService } from '../../../core/services/user.service';
import { Department } from '../../../core/models/department.model';
import { PastEventCardResponse } from '../../../core/models/feedback.model';
import { PageResponse } from '../../../core/models/page-response.model';
import { EVENT_CATEGORY_OPTIONS } from '../../../core/constants/event-categories';

@Component({
  selector: 'app-past-events',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, FormsModule],
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
  pageSize = 8;
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
          this.events = page.items ?? [];
          this.totalPages = page.totalPages || 1;
          this.totalItems = page.totalItems || 0;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.events = [];
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger les événements passés.';
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

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadEvents();
    }
  }

  nextPage(): void {
    if (this.currentPage + 1 < this.totalPages) {
      this.currentPage++;
      this.loadEvents();
    }
  }
}