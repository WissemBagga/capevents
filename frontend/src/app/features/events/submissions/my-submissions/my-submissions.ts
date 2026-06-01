import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventService } from '@core/services/event.service';
import { EventResponse } from '@core/models/event.model';
import { ScrollToMessageDirective } from '../../../../shared/directives/scroll-to-message.directive';


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

  pendingCount = 0;
  validatedCount = 0;
  publishedCount = 0;

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
          this.calculateStats();
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

  statusLabel(status: string): string {
    switch (status) {
      case 'PUBLISHED': return 'Publiée';
      case 'VALIDATED': return 'Validée';
      case 'PENDING': return 'En attente';
      case 'DRAFT': return 'Brouillon';
      case 'REJECTED': return 'Refusée';
      case 'CANCELLED': return 'Annulée';
      case 'ARCHIVED': return 'Archivée';
      default: return status;
    }
  }

  canOpenEvent(status: string): boolean {
    return status === 'PUBLISHED';
  }

  canOpenDetails(status: string): boolean {
    return status === 'VALIDATED';
  }

  trackByEventId(_: number, item: EventResponse): string {
    return item.id;
  }

  calculateStats(): void {
    this.pendingCount = this.submissions.filter(s => s.status === 'PENDING').length;
    // Assuming VALIDATED might exist or be derived, else 0 for now
    this.validatedCount = this.submissions.filter(s => (s.status as any) === 'VALIDATED').length;
    this.publishedCount = this.submissions.filter(s => s.status === 'PUBLISHED').length;
  }

  getDay(dateString: string | null): string {
    if (!dateString) return '--';
    return new Date(dateString).getDate().toString().padStart(2, '0');
  }

  getMonth(dateString: string | null): string {
    if (!dateString) return '---';
    return new Date(dateString).toLocaleString('fr-FR', { month: 'short' }).toUpperCase().replace('.', '');
  }

  getWeekday(dateString: string | null): string {
    if (!dateString) return '---';
    return new Date(dateString).toLocaleString('fr-FR', { weekday: 'short' }).toUpperCase().replace('.', '');
  }

  getProposalStatusColor(status: string): string {
    switch(status) {
      case 'PENDING': return 'orange';
      case 'VALIDATED': return 'green';
      case 'PUBLISHED': return 'blue';
      default: return 'gray';
    }
  }

  getProgressSteps(status: string): { id: string, label: string, completed: boolean, active: boolean }[] {
    const steps = [
      { id: 'SUBMITTED', label: 'Soumise' },
      { id: 'PENDING', label: 'En attente' },
      { id: 'PUBLISHED', label: 'Publiée' }
    ];

    let currentIndex = 0;
    if (status === 'PENDING') currentIndex = 1;
    if (status === 'VALIDATED' || status === 'PUBLISHED') currentIndex = 2;

    return steps.map((s, i) => ({
      id: s.id,
      label: s.label,
      completed: i < currentIndex || status === 'PUBLISHED' || status === 'VALIDATED',
      active: i === currentIndex
    }));
  }

  getNextStepLabel(status: string): string | null {
    if (status === 'PENDING') return 'En cours de revue RH';
    if (status === 'VALIDATED') return 'Prête à être publiée';
    return null;
  }

  getTargetAudience(event: EventResponse): string {
    if (event.audience === 'GLOBAL') return 'Tous départements';
    if (event.audience === 'DEPARTMENT' && event.targetDepartmentName) return event.targetDepartmentName;
    return 'Employés';
  }
}
