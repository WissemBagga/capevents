import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';


@Component({
  selector: 'app-pending-events',
  standalone: true,
  imports: [DatePipe, RouterLink, FormsModule, ScrollToMessageDirective],
  templateUrl: './pending-events.html',
  styleUrl: './pending-events.css'
})
export class PendingEvents {
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);

  pendingEvents: EventResponse[] = [];
  loading = false;
  errorMessage = '';

  rejectReasonById: Record<string, string> = {};
  showRejectBoxById: Record<string, boolean> = {};

  ngOnInit(): void {
    this.loadPendingEvents();
  }

  loadPendingEvents(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getPendingApprovals()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (page) => {
          this.pendingEvents = page.items ?? [];
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.pendingEvents = [];
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger les demandes en attente.';
          this.cdr.markForCheck();
        }
      });
  }

  approve(eventId: string): void {
    this.eventService.approvePendingAndPublish(eventId).subscribe({
      next: () => {
        this.pendingEvents = this.pendingEvents.filter(event => event.id !== eventId);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          err?.error ||
          'Impossible d’approuver cette demande.';
        this.cdr.markForCheck();
      }
    });
  }

  toggleRejectBox(eventId: string): void {
    this.showRejectBoxById[eventId] = !this.showRejectBoxById[eventId];
    this.cdr.markForCheck();
  }

  reject(eventId: string): void {
    const reason = this.rejectReasonById[eventId]?.trim();

    if (!reason) {
      this.errorMessage = 'La raison du refus est obligatoire.';
      this.cdr.markForCheck();
      return;
    }

    this.eventService.rejectPending(eventId, reason).subscribe({
      next: () => {
        this.pendingEvents = this.pendingEvents.filter(event => event.id !== eventId);
        this.rejectReasonById[eventId] = '';
        this.showRejectBoxById[eventId] = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          err?.error ||
          'Impossible de refuser cette demande.';
        this.cdr.markForCheck();
      }
    });
  }

  trackByEventId(_: number, item: EventResponse): string {
    return item.id;
  }
}
