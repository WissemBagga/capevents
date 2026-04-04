import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';
import { PageResponse } from '../../../core/models/page-response.model';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css'
})
export class EmployeeDashboard {
  private authService = inject(AuthService);
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);

  currentUser = this.authService.getCurrentUserSnapshot();

  loading = false;
  errorMessage = '';
  events: EventResponse[] = [];
  totalItems = 0;

  get firstName(): string {
    return this.currentUser?.firstName || 'Utilisateur';
  }

  get departmentName(): string {
    return this.currentUser?.departmentName || 'Non défini';
  }

  ngOnInit(): void {
    this.loadUpcomingEvents();
  }

  isFull(event: EventResponse): boolean {
    return event.remainingCapacity === 0;
  }

  loadUpcomingEvents(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getPublished(0, 4, 'startAt', 'asc')
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
}