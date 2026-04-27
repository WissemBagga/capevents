import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';
import { PageResponse } from '../../../core/models/page-response.model';
import { AuthService } from '../../../core/services/auth.service';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

import { UserService } from '../../../core/services/user.service';
import { Department } from '../../../core/models/department.model';

import { getDefaultEventImage, normalizeEventImageUrl } from '../../../core/constants/event-image-presets';



@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, FormsModule, ScrollToMessageDirective],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  
  private authService = inject(AuthService);

  private userService = inject(UserService);

  departments: Department[] = [];
  selectedAudience = 'ALL';
  selectedDepartmentId: number | null = null;


  events: EventResponse[] = [];
  filteredEvents: EventResponse[] = [];
  pagedEvents: EventResponse[] = [];
  selectedStatus= 'ALL';

  loading = false;
  actionLoading = false;
  errorMessage = '';

  currentPage = 0;
  pageSize = 9;
  totalPages = 0;
  totalItems = 0;
  hasNext = false;
  hasPrevious = false;
  



  ngOnInit(): void {
    if (this.authService.isHr()) {
      this.loadDepartments();
    }
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

    this.eventService.getHrAdminEvents(0, 1000, 'createdAt', 'desc')
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response: PageResponse<EventResponse>) => {
          this.events = response.items ?? [];
          this.currentPage = 0 ;
          this.applyStatusFilter();
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

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      'DRAFT': 'Brouillon',
      'PUBLISHED': 'Publié',
      'CANCELLED': 'Annulé',
      'ARCHIVED': 'Archivé',
      'PENDING': 'En attente',
      'REJECTED': 'Refusé'
    };
    return labels[status] || status;
  }

  onStatusChange(): void {
    this.currentPage = 0;
    this.applyStatusFilter();
    this.cdr.markForCheck();
  }

  private applyStatusFilter(): void {
    let result = [...this.events];

    if (this.selectedStatus !== 'ALL') {
      result = result.filter(e => e.status === this.selectedStatus);
    }

    if (this.authService.isHr() && this.selectedAudience !== 'ALL') {
      result = result.filter(e => e.audience === this.selectedAudience);
    }

    if (this.authService.isHr() && this.selectedAudience === 'DEPARTMENT' && this.selectedDepartmentId !== null) {
      result = result.filter(e => e.targetDepartmentId === this.selectedDepartmentId);
    }

    this.filteredEvents = result;

    this.totalItems = this.filteredEvents.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));

    if (this.totalItems === 0) {
      this.currentPage = 0;
    } else if (this.currentPage >= this.totalPages) {
      this.currentPage = this.totalPages - 1;
    }

    this.updatePagedEvents();
  }

  onAudienceChange(): void {
    if (this.selectedAudience !== 'DEPARTMENT') {
      this.selectedDepartmentId = null;
    }
    this.currentPage = 0;
    this.applyStatusFilter();
    this.cdr.markForCheck();
  }

  onDepartmentFilterChange(): void {
    this.currentPage = 0;
    this.applyStatusFilter();
    this.cdr.markForCheck();
  }

  private updatePagedEvents(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.pagedEvents = this.filteredEvents.slice(start, end);
    this.hasPrevious = this.currentPage > 0;
    this.hasNext = this.currentPage + 1 < this.totalPages;
  }

  previousPage(): void {
    if (!this.hasPrevious) return;
    this.currentPage--;
    this.updatePagedEvents();
    this.cdr.markForCheck();
  }

  nextPage(): void {
    if (!this.hasNext) return;
    this.currentPage++;
    this.updatePagedEvents();
    this.cdr.markForCheck();
  }

  goToEdit(eventId: string): void {
    this.router.navigate(['/admin/edit-event', eventId]);
  }

  private isBeforeStart(event: EventResponse): boolean {
    return new Date(event.startAt).getTime() > Date.now();
  }

  private isAfterStart(event: EventResponse): boolean {
    return new Date(event.startAt).getTime() <= Date.now();
  }

  canEdit(event: EventResponse): boolean {
    return event.status === 'DRAFT' || event.status === 'PUBLISHED';
  }

  canPublish(event: EventResponse): boolean {
    return event.status === 'DRAFT';
  }

  canCancel(event: EventResponse): boolean {
    return (event.status === 'DRAFT' || event.status === 'PUBLISHED') && this.isBeforeStart(event);
  }

  canArchive(event: EventResponse): boolean {
    return (event.status === 'DRAFT' || event.status === 'PUBLISHED') && this.isAfterStart(event);
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
          this.errorMessage = err?.error?.message || err?.error || 'Impossible de publier cet événement.';
          this.cdr.markForCheck();
        }
      });
  }

  archive(eventId: string): void {
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
          this.errorMessage = err?.error?.message || err?.error || 'Impossible d’archiver cet événement.';
          this.cdr.markForCheck();
        }
      });
  }
  

  cancel(event: EventResponse): void {
    const registered = event.registeredCount ?? 0;
    const reason = window.prompt(
      registered > 0
        ? `Entrez la raison de l’annulation. ${registered} personne(s) sont déjà inscrites :`
        : 'Entrez la raison de l’annulation :'
    );

    if (!reason || !reason.trim()) return;

    this.actionLoading = true;
    this.cdr.markForCheck();

    this.eventService.cancelEvent(event.id, reason.trim())
      .pipe(finalize(() => {
        this.actionLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => this.loadEvents(),
        error: (err) => {
          this.errorMessage = err?.error?.message || err?.error || 'Impossible d’annuler cet événement.';
          this.cdr.markForCheck();
        }
      });
  }

  getEventImageUrl(event: EventResponse): string {
    return normalizeEventImageUrl(event.imageUrl) || getDefaultEventImage(event.category);
  }

  get dashboardTitle(): string {
    return this.authService.isHr() ? 'Gestion des événements RH' : 'Gestion des événements';
  }

  get dashboardSubtitle(): string {
    return this.authService.isHr()
      ? 'Gérez le cycle de vie de tous les événements de la plateforme.'
      : 'Gérez les événements de votre périmètre.';
  } 

  get isHr(): boolean{
    return this.authService.isHr();
  }
}
