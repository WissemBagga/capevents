import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { RegistrationResponse } from '../../../core/models/registration.model';
import { FormsModule } from '@angular/forms';

type MyEventsFilter = 'ALL' | 'UPCOMING' | 'PAST';


@Component({
  selector: 'app-my-events',
  standalone: true,
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './my-events.html',
  styleUrl: './my-events.css'
})
export class MyEvents {
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);

  registrations: RegistrationResponse[] = [];
  filteredRegistrations: RegistrationResponse[] = [];

  loading = false;
  errorMessage   = '';
  selectedFilter: MyEventsFilter = 'ALL';


  ngOnInit(): void {
    this.loadMyRegistrations();
  }

  loadMyRegistrations(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getMyRegistrations()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (registrations) => {
          this.registrations = this.sortByNearest(registrations ?? []);
          this.applyFilter();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger vos inscriptions.';
          this.cdr.markForCheck();
        }
      });
  }

  onFilterChange(): void {
    this.applyFilter();
    this.cdr.markForCheck();
  }

  private applyFilter(): void {
    const now = new Date();

    if (this.selectedFilter === 'UPCOMING') {
      this.filteredRegistrations = this.registrations.filter(
        registration => (new Date(registration.eventStartAt).getTime()) >= now.getTime()
      );
      return;
    }

    if (this.selectedFilter === 'PAST') {
      this.filteredRegistrations = this.registrations.filter(
        registration => (new Date(registration.eventStartAt).getTime()) <= now.getTime()
      );
      return;
    }

    this.filteredRegistrations = [...this.registrations];
  }

  private sortByNearest(registrations: RegistrationResponse[]): RegistrationResponse[] {
    const now = new Date().getTime();

    return [...registrations].sort((a, b) => {
      const aTime = new Date(a.eventStartAt).getTime();
      const bTime = new Date(b.eventStartAt).getTime();

      const aUpcoming = aTime >= now;
      const bUpcoming = bTime >= now;

      if (aUpcoming && !bUpcoming) return -1;
      if (!aUpcoming && bUpcoming) return 1;

      if (aUpcoming && bUpcoming) {
        return aTime - bTime;
      }

      return bTime - aTime;
    });
  }

  isUpcoming(registration: RegistrationResponse): boolean {
    return new Date(registration.eventStartAt).getTime() >= new Date().getTime();
  }

  canLeaveFeedback(registration: RegistrationResponse): boolean {
    return registration.status === 'REGISTERED'
      && new Date(registration.eventStartAt).getTime() < new Date().getTime();
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'REGISTERED':
        return 'Inscrit';
      case 'CANCELLED':
        return 'Annulé';
      default:
        return status;
    }
  }
}
