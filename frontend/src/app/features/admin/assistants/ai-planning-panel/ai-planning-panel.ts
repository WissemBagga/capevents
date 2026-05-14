import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { AiPlanningService } from '../../../../core/services/ai-planning.service';
import { Department } from '../../../../core/models/department.model';
import {
  AiPlanningEventProposal,
  AiPlanningEventProposalResponse
} from '../../../../core/models/ai-planning.model';

@Component({
  selector: 'app-ai-planning-panel',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './ai-planning-panel.html',
  styleUrl: './ai-planning-panel.css'
})
export class AiPlanningPanel {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private aiPlanningService = inject(AiPlanningService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  departments: Department[] = [];

  aiPlanningLoading = false;
  aiPlanningError = '';
  aiPlanningResponse: AiPlanningEventProposalResponse | null = null;

  planningReferenceDate = '';
  planningLimit = 3;
  planningSlotLimit = 3;
  planningDaysHorizon = 30;
  planningTargetDepartmentId: number | null = null;

  ngOnInit(): void {
    if (this.isHr) {
      this.loadDepartments();
    }

    if (this.isManager) {
      this.planningTargetDepartmentId =
        this.authService.getCurrentUserSnapshot()?.departmentId ?? null;
    }
  }

  get isHr(): boolean {
    return this.authService.isHr();
  }

  get isManager(): boolean {
    return this.authService.isManager();
  }

  get currentDepartmentName(): string {
    return this.authService.getCurrentUserSnapshot()?.departmentName || 'Votre département';
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

  loadAiPlanningProposals(): void {
    this.aiPlanningLoading = true;
    this.aiPlanningError = '';
    this.aiPlanningResponse = null;
    this.cdr.markForCheck();

    const targetDepartmentId = this.isManager
      ? this.authService.getCurrentUserSnapshot()?.departmentId ?? null
      : this.planningTargetDepartmentId;

    const safeLimit = Math.min(Math.max(Number(this.planningLimit) || 3, 1), 5);
    const safeSlotLimit = Math.min(Math.max(Number(this.planningSlotLimit) || 3, 1), 5);
    const safeDaysHorizon = Math.min(Math.max(Number(this.planningDaysHorizon) || 30, 7), 50);

    this.aiPlanningService.proposeEvents({
      referenceDate: this.planningReferenceDate || null,
      targetDepartmentId,
      limit: safeLimit,
      slotLimit: safeSlotLimit,
      daysHorizon: safeDaysHorizon
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

  usePlanningProposal(proposal: AiPlanningEventProposal): void {
    const firstSlot = proposal.suggestedSlots?.[0];

    if (!firstSlot) {
      this.aiPlanningError = 'Cette proposition ne contient aucun créneau utilisable.';
      this.cdr.markForCheck();
      return;
    }

    const targetDepartmentId = this.isManager
      ? this.authService.getCurrentUserSnapshot()?.departmentId ?? null
      : proposal.targetDepartmentId;

    const draft = {
      title: proposal.title,
      category: proposal.category,
      description: this.buildPlanningDescription(proposal),
      startAt: firstSlot.startAt,
      durationMinutes: proposal.durationMinutes,
      locationType: proposal.locationType || 'ONSITE',
      capacity: proposal.capacity,
      audience: this.isManager ? 'DEPARTMENT' : proposal.audience,
      targetDepartmentId,

      aiPlanningUsage: {
        requestId: this.aiPlanningResponse?.requestId ?? null,
        proposalRank: proposal.rank,
        proposalTitle: proposal.title,
        category: proposal.category,
        targetDepartmentId,
        selectedSlotStartAt: firstSlot.startAt,
        selectedSlotScore: firstSlot.score
      },

      aiPlanningAdminNote: this.buildPlanningAdminNote(proposal)
    };

    const key = `ai-planning-proposal-${Date.now()}`;
    const trackingKey = `ai-planning-tracking-${Date.now()}`;

    sessionStorage.setItem(key, JSON.stringify(draft));
    sessionStorage.setItem(trackingKey, JSON.stringify(draft.aiPlanningUsage));

    this.logPlanningUsage(proposal, 'USED_TO_PREFILL');

    this.router.navigate(['/admin/create-event'], {
      queryParams: {
        aiProposal: key,
        aiTracking: trackingKey
      }
    });
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

    this.logPlanningUsage(proposal, 'COPIED');
  }

  private buildPlanningDescription(proposal: AiPlanningEventProposal): string {
    const rationale = (proposal.rationale ?? [])
      .map(item => `• ${item}`)
      .join('\n');

    return [
      proposal.objective,
      '',
      `Participez à « ${proposal.title} », un événement interne conçu pour accompagner les collaborateurs dans leur développement professionnel.`,
      '',
      'Cette session proposera un moment d’échange, de partage de pratiques et de réflexion collective autour d’un sujet utile au quotidien professionnel.',
      '',
      'Votre participation contribuera à enrichir les échanges et à renforcer la collaboration au sein de l’organisation.',
      '',
      'Justification IA :',
      rationale,
      '',
      'Note : cette proposition doit être validée par le RH ou le manager avant publication.'
    ].join('\n');
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

  planningConfidenceLabel(confidence: string): string {
    switch (confidence) {
      case 'HIGH':
        return 'Confiance élevée';
      case 'MEDIUM':
        return 'Confiance moyenne';
      case 'LOW':
        return 'Confiance faible';
      case 'VERY_LOW':
        return 'Confiance très faible';
      default:
        return confidence || 'Confiance non définie';
    }
  }

  trackByPlanningProposal(_: number, item: AiPlanningEventProposal): number {
    return item.rank;
  }

  trackByPlanningSlot(_: number, item: any): number {
    return item.rank;
  }

  private logPlanningUsage(
    proposal: AiPlanningEventProposal,
    action: 'COPIED' | 'USED_TO_PREFILL'
  ): void {
    const firstSlot = proposal.suggestedSlots?.[0];

    const targetDepartmentId = this.isManager
      ? this.authService.getCurrentUserSnapshot()?.departmentId ?? null
      : proposal.targetDepartmentId;

    this.aiPlanningService.logUsage({
      requestId: this.aiPlanningResponse?.requestId ?? undefined,
      action,
      proposalRank: proposal.rank,
      proposalTitle: proposal.title,
      category: proposal.category,
      targetDepartmentId,
      selectedSlotStartAt: firstSlot?.startAt ?? null,
      selectedSlotScore: firstSlot?.score ?? null,
      source: 'ai_assistants_planning_panel'
    }).subscribe({
      error: (err) => {
        console.error('[AI PLANNING USAGE LOG ERROR]', err);
      }
    });
  }

  private buildPlanningAdminNote(proposal: AiPlanningEventProposal): string {
    const firstSlot = proposal.suggestedSlots?.[0];

    const rationale = (proposal.rationale ?? [])
      .map(item => `• ${item}`)
      .join('\n');

    const slotText = firstSlot
      ? `Créneau recommandé : ${new Date(firstSlot.startAt).toLocaleString('fr-FR')}`
      : 'Créneau recommandé : à confirmer';

    return [
      'Note IA interne',
      slotText,
      '',
      'Justification :',
      rationale,
      '',
      'Cette proposition doit être validée par le RH ou le manager avant publication.'
    ].join('\n');
  }
}