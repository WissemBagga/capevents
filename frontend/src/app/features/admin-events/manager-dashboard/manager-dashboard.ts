import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.css'
})
export class ManagerDashboard {
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  events: EventResponse[] = [];
  loading = false;
  actionLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {

    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getDepartmentAdminEvents()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response: EventResponse[]) => {
          this.events = response;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.events = [];
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger les événements du département.';
          this.cdr.markForCheck();
        }
      });
  }

  goToEdit(eventId: string): void {
    this.router.navigate(['/admin/edit-event', eventId]);
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
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de publier cet événement.';
          this.cdr.markForCheck();
        }
      });
  }

  archive(eventId: string): void {
    if (!window.confirm('Voulez-vous vraiment archiver cet événement ?')) {
      return;
    }
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
        next: () => this.loadEvents(),
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible d’annuler cet événement.';
          this.cdr.markForCheck();
        }
      });
  }

  canEdit(event: EventResponse): boolean {
  return event.status === 'DRAFT' || event.status === 'PUBLISHED';
  }

  canPublish(event: EventResponse): boolean {
    return event.status === 'DRAFT';
  }

  canCancel(event: EventResponse): boolean {
    return event.status === 'DRAFT' || event.status === 'PUBLISHED';
  }

  canArchive(event: EventResponse): boolean {
    return event.status === 'DRAFT' || event.status === 'PUBLISHED';
  }


}