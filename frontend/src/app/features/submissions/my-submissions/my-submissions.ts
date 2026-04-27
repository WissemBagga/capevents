import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';
import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';


@Component({
  selector: 'app-my-submissions',
  standalone: true,
  imports: [DatePipe, RouterLink, ScrollToMessageDirective],
  templateUrl: './my-submissions.html',
  styleUrl: './my-submissions.css'
})
export class MySubmissions {
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);

  submissions: EventResponse[] = [];
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadMySubmissions();
  }

  loadMySubmissions(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getMySubmissions()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (page) => {
          this.submissions = page.items ?? [];
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.submissions = [];
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger vos demandes.';
          this.cdr.markForCheck();
        }
      });
  }

  statusLabel(status: EventResponse['status']): string {
    switch (status) {
      case 'PUBLISHED':
        return 'Publié';
      case 'PENDING':
        return 'En attente';
      case 'DRAFT':
        return 'Brouillon';
      case 'REJECTED':
        return 'Refusé';  
      case 'CANCELLED':
        return 'Annulé';
      case 'ARCHIVED':
        return 'Archivé';
      default:
        return status;
    }
  }

  canOpenEvent(status: EventResponse['status']): boolean {
    return status === 'PUBLISHED';
  }

  trackByEventId(_: number, item: EventResponse): string {
    return item.id;
  }
}