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

import { resolveEventImageUrl } from '../../../core/constants/event-image-presets';

import { AiPlanningService } from '../../../core/services/ai-planning.service';
import {
  AiPlanningEventProposal,
  AiPlanningEventProposalResponse
} from '../../../core/models/ai-planning.model';



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

  private aiPlanningService = inject(AiPlanningService);

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


  aiPlanningLoading = false;
  aiPlanningError = '';
  aiPlanningResponse: AiPlanningEventProposalResponse | null = null;
  showAiPlanningPanel = false;

  planningReferenceDate = '';
  planningLimit = 3;
  planningSlotLimit = 3;
  planningDaysHorizon = 30;
  planningTargetDepartmentId: number | null = null;
  



  ngOnInit(): void {
    if (this.authService.isHr()) {
      this.loadDepartments();
    }

    if (this.authService.isManager()) {
      const currentUser = this.authService.getCurrentUserSnapshot();
      this.planningTargetDepartmentId = currentUser?.departmentId ?? null;
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
    return resolveEventImageUrl(event.imageUrl, event.category);
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

  get isManager(): boolean {
    return this.authService.isManager();
  }

  get currentDepartmentName(): string {
    return this.authService.getCurrentUserSnapshot()?.departmentName || 'Votre département';
  }

  canUsePlanningAi(): boolean {
    return this.authService.isHr() || this.authService.isManager();
  }

  toggleAiPlanningPanel(): void {
    this.showAiPlanningPanel = !this.showAiPlanningPanel;
    this.cdr.markForCheck();
  }

  loadAiPlanningProposals(): void {
    if (!this.canUsePlanningAi()) return;

    this.aiPlanningLoading = true;
    this.aiPlanningError = '';
    this.aiPlanningResponse = null;
    this.cdr.markForCheck();

    const targetDepartmentId = this.authService.isManager()
      ? this.authService.getCurrentUserSnapshot()?.departmentId ?? null
      : this.planningTargetDepartmentId;

    this.aiPlanningService.proposeEvents({
      referenceDate: this.planningReferenceDate || null,
      targetDepartmentId,
      limit: this.planningLimit,
      slotLimit: this.planningSlotLimit,
      daysHorizon: this.planningDaysHorizon
    })
      .pipe(finalize(() => {
        this.aiPlanningLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.aiPlanningResponse = response;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.aiPlanningError =
            err?.error?.message ||
            err?.error ||
            'Impossible de générer les propositions IA.';
          this.cdr.markForCheck();
        }
      });
  }

  planningScorePercent(score: number): number {
    return Math.round((score ?? 0) * 100);
  }

  planningAudienceLabel(audience: string): string {
    switch (audience) {
      case 'GLOBAL':
        return 'Global';
      case 'DEPARTMENT':
        return 'Département';
      default:
        return audience || 'N/D';
    }
  }

  planningLocationLabel(locationType: string): string {
    switch (locationType) {
      case 'ONSITE':
        return 'Présentiel';
      case 'ONLINE':
        return 'En ligne';
      case 'EXTERNAL':
        return 'Externe';
      default:
        return locationType || 'N/D';
    }
  }

  usePlanningProposal(proposal: AiPlanningEventProposal): void {
    const firstSlot = proposal.suggestedSlots?.[0];

    if (!firstSlot) {
      this.aiPlanningError = 'Cette proposition ne contient aucun créneau utilisable.';
      this.cdr.markForCheck();
      return;
    }

    const draft = {
      title: proposal.title,
      category: proposal.category,
      description: this.buildPlanningDescription(proposal),
      startAt: firstSlot.startAt,
      durationMinutes: proposal.durationMinutes,
      locationType: proposal.locationType || 'ONSITE',
      capacity: proposal.capacity,
      audience: this.authService.isManager() ? 'DEPARTMENT' : proposal.audience,
      targetDepartmentId: this.authService.isManager()
        ? this.authService.getCurrentUserSnapshot()?.departmentId ?? null
        : proposal.targetDepartmentId
    };

    const key = `ai-planning-proposal-${Date.now()}`;
    sessionStorage.setItem(key, JSON.stringify(draft));

    this.router.navigate(['/admin/create-event'], {
      queryParams: {
        aiProposal: key
      }
    });
  }

  private buildPlanningDescription(proposal: AiPlanningEventProposal): string {
    const rationale = (proposal.rationale ?? [])
      .map(item => `- ${item}`)
      .join('\n');

    return [
      proposal.objective,
      '',
      'Proposition générée par IA Planning Intelligent.',
      '',
      'Justification :',
      rationale
    ].join('\n');
  }

  copyPlanningProposal(proposal: AiPlanningEventProposal): void {
    const firstSlot = proposal.suggestedSlots?.[0];

    const text = [
      `Titre : ${proposal.title}`,
      `Catégorie : ${proposal.category}`,
      `Audience : ${this.planningAudienceLabel(proposal.audience)}`,
      `Format : ${this.planningLocationLabel(proposal.locationType)}`,
      `Durée : ${proposal.durationMinutes} minutes`,
      `Capacité : ${proposal.capacity} places`,
      firstSlot ? `Créneau recommandé : ${new Date(firstSlot.startAt).toLocaleString('fr-FR')}` : '',
      '',
      `Objectif : ${proposal.objective}`,
      '',
      'Justification :',
      ...(proposal.rationale ?? []).map(item => `- ${item}`)
    ].filter(Boolean).join('\n');

    navigator.clipboard?.writeText(text);
  }

  trackByPlanningProposal(_: number, item: AiPlanningEventProposal): number {
    return item.rank;
  }

  trackByPlanningSlot(_: number, item: any): number {
    return item.rank;
  }
}
