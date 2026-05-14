import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';

import { AuthService } from '../../../../core/services/auth.service';
import { AdminAnalyticsOverviewResponse, EventEngagementResponse } from '../../../../core/models/admin-analytics.model';
import { AdminAnalyticsService } from '../../../../core/services/admin-analytics.service';
import { UserService } from '../../../../core/services/user.service';
import { Department } from '../../../../core/models/department.model';
import { EVENT_CATEGORY_OPTIONS } from '../../../../core/constants/event-categories';
import { ScrollToMessageDirective } from '../../../../shared/directives/scroll-to-message.directive';

import { AiMonitoringService } from '../../../../core/services/ai-monitoring.service';
import { AiRecommendationMonitoringSummary, AiRecentPrediction, AiTopRecommendedEvent } from '../../../../core/models/ai-monitoring.model';


import { AiHrCopilotMonitoringService } from '../../../../core/services/ai-hr-copilot-monitoring.service';
import { AiHrCopilotMonitoringResponse } from '../../../../core/models/ai-hr-copilot-monitoring.model';


import { AiPlanningService } from '../../../../core/services/ai-planning.service';
import { AiPlanningMonitoringSummary } from '../../../../core/models/ai-planning.model';

type TrendPointVm = {
  month: string;
  registrations: number;
  x: number;
  y: number;
};
type StatsAiMonitoringPanel = 'recommendations' | 'hr-copilot' | 'planning';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [RouterLink, DecimalPipe, FormsModule, ScrollToMessageDirective, DatePipe],
  templateUrl: './admin-stats.html',
  styleUrl: './admin-stats.css',
})
export class AdminStats {
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private adminAnalyticsService = inject(AdminAnalyticsService);
  private userService = inject(UserService);
  private aiMonitoringService = inject(AiMonitoringService);
  private aiHrCopilotMonitoringService = inject(AiHrCopilotMonitoringService);


  readonly trendChartWidth = 640;
  readonly trendChartHeight = 260;
  readonly trendChartPaddingLeft = 36;
  readonly trendChartPaddingRight = 20;
  readonly trendChartPaddingTop = 20;
  readonly trendChartPaddingBottom = 42;
  readonly categoryOptions = EVENT_CATEGORY_OPTIONS;

  analytics: AdminAnalyticsOverviewResponse | null = null;

  loading = false;
  loadingDepartments = false;
  errorMessage = '';
  departments: Department[] = [];

  aiMonitoring: AiRecommendationMonitoringSummary | null = null;
  aiMonitoringLoading = false;
  aiMonitoringErrorMessage = '';

  filters = {
    from: '',
    to: '',
    departmentId: null as number | null,
    category: ''
  };


  aiCopilotMonitoring: AiHrCopilotMonitoringResponse | null = null;
  aiCopilotMonitoringLoading = false;
  aiCopilotMonitoringError = '';

  
  private aiPlanningService = inject(AiPlanningService);

  planningMonitoringLoading = false;
  planningMonitoringError = '';
  planningMonitoring: AiPlanningMonitoringSummary | null = null;
  planningMonitoringDays = 30;
  selectedAiMonitoringPanel: StatsAiMonitoringPanel | null = null;

  ngOnInit(): void {
    if (this.isHr) {
      this.loadDepartments();
      this.loadAiMonitoring();
      this.loadAiCopilotMonitoring();
    }

    if (this.isHr || this.isManager) {
      this.loadPlanningMonitoring();
    }

    this.loadAnalytics();
  }

  loadPlanningMonitoring(): void {
    this.planningMonitoringLoading = true;
    this.planningMonitoringError = '';
    this.cdr.markForCheck();

    const targetDepartmentId = this.authService.isManager()
      ? this.authService.getCurrentUserSnapshot()?.departmentId ?? null
      : null;

    this.aiPlanningService.getMonitoringSummary(
      this.planningMonitoringDays,
      targetDepartmentId
    )
      .pipe(finalize(() => {
        this.planningMonitoringLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (summary) => {
          this.planningMonitoring = this.normalizePlanningMonitoring(summary);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.planningMonitoringError =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger le monitoring IA Planning.';
          this.cdr.markForCheck();
        }
      });
  }

  planningUsagePercent(): number {
    return Math.round((this.planningMonitoring?.usageRate ?? 0) * 100);
  }

  private loadDepartments(): void {
    this.loadingDepartments = true;
    this.cdr.markForCheck();

    this.userService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
        this.loadingDepartments = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingDepartments = false;
        this.errorMessage = 'Impossible de charger la liste des départements.';
        this.cdr.markForCheck();
      }
    });
  }

  loadAnalytics(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.adminAnalyticsService.getOverview(this.filters)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.analytics = response;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.analytics = null;
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger les analytics.';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    this.loadAnalytics();
  }

  resetFilters(): void {
    this.filters = {
      from: '',
      to: '',
      departmentId: null,
      category: ''
    };
    this.loadAnalytics();
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      PUBLISHED: 'Publié',
      CANCELLED: 'Annulé',
      ARCHIVED: 'Archivé',
      PENDING: 'En attente'
    };
    return labels[status] || status;
  }

  trackByRatedEventId(_: number, item: { eventId: string }): string {
    return item.eventId;
  }

  trackByEventId(_: number, item: EventEngagementResponse): string {
    return item.eventId;
  }

  get dashboardTitle(): string {
    return this.authService.isHr() ? 'Statistiques RH' : 'Statistiques Manager';
  }

  get dashboardSubtitle(): string {
    return this.authService.isHr()
      ? 'Vue d’ensemble des performances des événements et des feedbacks.'
      : 'Vue d’ensemble des indicateurs de votre périmètre.';
  }

  get managementRoute(): string {
    return this.authService.isHr() ? '/admin/hr' : '/admin/manager';
  }

  get isHr(): boolean {
    return this.authService.isHr();
  }

  get isManager(): boolean {
    return this.authService.isManager();
  }

  trackByMemberEmail(_: number, item: { email: string }): string {
    return item.email;
  }

  trackByMonth(_: number, item: { month: string }): string {
    return item.month;
  }

  trackByTopMember(_: number, item: { email: string }): string {
    return item.email;
  }

  trackByDepartment(_: number, item: { departmentId: number }): number {
    return item.departmentId;
  }

  trackByDepartmentOption(_: number, item: Department): number {
    return item.id;
  }

  trackByCategoryOption(_: number, item: { value: string }): string {
    return item.value;
  }

  get maxMonthlyRegistrations(): number {
    if (!this.analytics?.monthlyTrend?.length) return 1;
    return Math.max(...this.analytics.monthlyTrend.map(item => item.registrations), 1);
  }

  barWidth(value: number, max: number): string {
    if (max <= 0) return '0%';
    return `${Math.max(8, (value / max) * 100)}%`;
  }

  departmentBarWidth(rate: number): string {
    return `${Math.max(8, Math.min(rate, 100))}%`;
  }

  registrationProgress(item: EventEngagementResponse): number {
    if (!item.capacity || item.capacity <= 0) return 0;
    return Math.min(100, (item.registeredCount / item.capacity) * 100);
  }

  exportMembersExcel(): void {
    if (!this.analytics?.memberRows?.length) return;

    const rows = this.analytics.memberRows.map((item, index) => ({
      Rang: index + 1,
      Nom: item.fullName,
      Email: item.email,
      Département: item.departmentName || '',
      Inscrits: item.registeredCount,
      Présents: item.presentCount,
      'Taux présence (%)': item.attendanceRate
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Membres');
    XLSX.writeFile(workbook, 'liste-membres-engagement.xlsx');
  }


  get monthlyTrendPoints(): TrendPointVm[] {
    const data = this.analytics?.monthlyTrend ?? [];
    if (!data.length) return [];

    const max = Math.max(...data.map(item => item.registrations), 1);
    const drawWidth =
      this.trendChartWidth - this.trendChartPaddingLeft - this.trendChartPaddingRight;
    const drawHeight =
      this.trendChartHeight - this.trendChartPaddingTop - this.trendChartPaddingBottom;

    const step = data.length > 1 ? drawWidth / (data.length - 1) : 0;

    return data.map((item, index) => {
      const x = this.trendChartPaddingLeft + index * step;
      const y =
        this.trendChartPaddingTop +
        drawHeight * (1 - item.registrations / max);

      return {
        month: item.month,
        registrations: item.registrations,
        x,
        y
      };
    });
  }

  get trendPolylinePoints(): string {
    return this.monthlyTrendPoints.map(point => `${point.x},${point.y}`).join(' ');
  }

  get trendAreaPoints(): string {
    const points = this.monthlyTrendPoints;
    if (!points.length) return '';

    const baseline = this.trendChartHeight - this.trendChartPaddingBottom;
    const first = points[0];
    const last = points[points.length - 1];

    return [
      `${first.x},${baseline}`,
      ...points.map(point => `${point.x},${point.y}`),
      `${last.x},${baseline}`
    ].join(' ');
  }

  get trendGridLines(): { y: number; value: number }[] {
    const data = this.analytics?.monthlyTrend ?? [];
    if (!data.length) return [];

    const max = Math.max(...data.map(item => item.registrations), 1);
    const levels = 4;
    const drawHeight =
      this.trendChartHeight - this.trendChartPaddingTop - this.trendChartPaddingBottom;

    return Array.from({ length: levels + 1 }, (_, index) => {
      const ratio = index / levels;
      const value = Math.round(max * (1 - ratio));
      const y = this.trendChartPaddingTop + drawHeight * ratio;

      return { y, value };
    });
  }

  get trendPeakPoint(): TrendPointVm | null {
    const points = this.monthlyTrendPoints;
    if (!points.length) return null;

    return points.reduce((best, current) =>
      current.registrations > best.registrations ? current : best
    );
  }

  get trendTotalRegistrations(): number {
    return (this.analytics?.monthlyTrend ?? [])
      .reduce((sum, item) => sum + item.registrations, 0);
  }

  get trendDeltaPercent(): number | null {
    const data = this.analytics?.monthlyTrend ?? [];
    if (data.length < 2) return null;

    const first = data[0].registrations;
    const last = data[data.length - 1].registrations;

    if (first === 0 && last === 0) return 0;
    if (first === 0) return 100;

    return Math.round(((last - first) / first) * 100);
  }

  get trendDeltaLabel(): string {
    const delta = this.trendDeltaPercent;
    if (delta === null) return 'Variation N/D';
    if (delta > 0) return `+${delta}% vs début période`;
    if (delta < 0) return `${delta}% vs début période`;
    return 'Stable sur la période';
  }

  get trendDeltaClass(): string {
    const delta = this.trendDeltaPercent;
    if (delta === null) return 'neutral-chip';
    if (delta > 0) return 'positive-chip';
    if (delta < 0) return 'negative-chip';
    return 'neutral-chip';
  }

  get departmentChampion() {
    return this.sortedDepartmentRows[0] ?? null;
  }


  get sortedDepartmentRows() {
    const rows = this.analytics?.departmentRows ?? [];
    return [...rows].sort((a, b) => {
      const ratingA = a.averageRating ?? -1;
      const ratingB = b.averageRating ?? -1;

      if (b.participationRate !== a.participationRate) {
        return b.participationRate - a.participationRate;
      }

      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }

      if (b.activeEmployees !== a.activeEmployees) {
        return b.activeEmployees - a.activeEmployees;
      }

      return a.departmentName.localeCompare(b.departmentName, 'fr');
    });
  }

  get sortedTopMembers() {
    const rows = this.analytics?.topMembers ?? [];
    return [...rows].sort((a, b) => {
      if (b.attendanceRate !== a.attendanceRate) {
        return b.attendanceRate - a.attendanceRate;
      }

      if (b.presentCount !== a.presentCount) {
        return b.presentCount - a.presentCount;
      }

      if (b.registeredCount !== a.registeredCount) {
        return b.registeredCount - a.registeredCount;
      }

      return a.fullName.localeCompare(b.fullName, 'fr');
    });
  }

  get sortedTopRatedEvents() {
    const rows = this.analytics?.topRatedEvents ?? [];
    return [...rows].sort((a, b) => {
      if (b.averageRating !== a.averageRating) {
        return b.averageRating - a.averageRating;
      }

      if (b.feedbackCount !== a.feedbackCount) {
        return b.feedbackCount - a.feedbackCount;
      }

      return a.title.localeCompare(b.title, 'fr');
    });
  }

  get sortedTopEngagingEvents() {
    const rows = this.analytics?.topEngagingEvents ?? [];
    return [...rows].sort((a, b) => {
      if (b.attendanceRate !== a.attendanceRate) {
        return b.attendanceRate - a.attendanceRate;
      }

      const fillDiff = this.fillRate(b) - this.fillRate(a);
      if (fillDiff !== 0) {
        return fillDiff;
      }

      if (b.presentCount !== a.presentCount) {
        return b.presentCount - a.presentCount;
      }

      if (b.registeredCount !== a.registeredCount) {
        return b.registeredCount - a.registeredCount;
      }

      return a.title.localeCompare(b.title, 'fr');
    });
  }

  fillRate(item: EventEngagementResponse): number {
    if (!item.capacity || item.capacity <= 0) return 0;
    return (item.registeredCount / item.capacity) * 100;
  }


  get sortedTopParticipantPerDepartment() {
    const rows = this.analytics?.topParticipantPerDepartment ?? [];
    return [...rows].sort((a, b) => {
      if (b.attendanceRate !== a.attendanceRate) {
        return b.attendanceRate - a.attendanceRate;
      }

      if (b.presentCount !== a.presentCount) {
        return b.presentCount - a.presentCount;
      }

      if (b.registeredCount !== a.registeredCount) {
        return b.registeredCount - a.registeredCount;
      }

      return a.departmentName.localeCompare(b.departmentName, 'fr');
    });
  }

  loadAiMonitoring(): void {
    if (!this.isHr) return;

    this.aiMonitoringLoading = true;
    this.aiMonitoringErrorMessage = '';
    this.cdr.markForCheck();

    this.aiMonitoringService.getRecommendationSummary(5, 5)
      .pipe(finalize(() => {
        this.aiMonitoringLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.aiMonitoring = this.normalizeRecommendationMonitoring(response);
          this.cdr.markForCheck();
        },
        error: () => {
          this.aiMonitoring = null;
          this.aiMonitoringErrorMessage = 'Impossible de charger le monitoring IA.';
          this.cdr.markForCheck();
        }
      });
  }

  get aiSuccessRate(): number {
    if (!this.aiMonitoring?.totalCalls) return 0;
    return (this.aiMonitoring.successfulCalls / this.aiMonitoring.totalCalls) * 100;
  }

  get aiFailureRate(): number {
    if (!this.aiMonitoring?.totalCalls) return 0;
    return (this.aiMonitoring.failedCalls / this.aiMonitoring.totalCalls) * 100;
  }

  trackByAiEventId(_: number, item: AiTopRecommendedEvent): string {
    return item.eventId;
  }

  trackByAiRequestId(_: number, item: AiRecentPrediction): string {
    return item.requestId;
  }

  aiStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      SUCCESS: 'Succès',
      USER_NOT_FOUND: 'Utilisateur introuvable',
      NO_CANDIDATES: 'Aucun candidat',
      ERROR: 'Erreur'
    };

    return labels[status] || status;
  }

  aiStatusClass(status: string): string {
    switch (status) {
      case 'SUCCESS':
        return 'ai-status-success';
      case 'USER_NOT_FOUND':
      case 'NO_CANDIDATES':
        return 'ai-status-warning';
      default:
        return 'ai-status-error';
    }
  }

  loadAiCopilotMonitoring(): void {
    if (!this.isHr) return;

    this.aiCopilotMonitoringLoading = true;
    this.aiCopilotMonitoringError = '';
    this.cdr.markForCheck();

    this.aiHrCopilotMonitoringService.getSummary(10)
      .pipe(finalize(() => {
        this.aiCopilotMonitoringLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.aiCopilotMonitoring = this.normalizeCopilotMonitoring(response);
          this.cdr.markForCheck();
        },
        error: () => {
          this.aiCopilotMonitoring = null;
          this.aiCopilotMonitoringError = 'Impossible de charger le monitoring du Copilote RH.';
          this.cdr.markForCheck();
        }
      });
  }


  copilotSuggestionTypeLabel(type: string): string {
    switch (type) {
      case 'LOW_REGISTRATION':
        return 'Faible inscription';
      case 'PENDING_INVITATIONS':
        return 'Invitations en attente';
      case 'RSVP_FRICTION':
        return 'Friction RSVP';
      case 'LOW_FEEDBACK_SCORE':
        return 'Feedback faible';
      case 'LOW_DEPARTMENT_ENGAGEMENT':
        return 'Département peu engagé';
      default:
        return type || 'Inconnu';
    }
  }

  copilotQwenUsagePercent(): number {
    return Math.round((this.aiCopilotMonitoring?.qwenUsageRate ?? 0) * 100);
  }

  copilotSuccessRatePercent(): number {
    const total = this.aiCopilotMonitoring?.totalCalls ?? 0;
    const success = this.aiCopilotMonitoring?.successfulCalls ?? 0;

    if (total === 0) return 0;

    return Math.round((success / total) * 100);
  }

  trackByCopilotType(_: number, item: { type: string; count: number }): string {
    return item.type;
  }

  trackByCopilotCall(_: number, item: { requestId: string }): string {
    return item.requestId;
  }

  copilotUsefulnessPercent(): number {
    return Math.round((this.aiCopilotMonitoring?.usefulnessRate ?? 0) * 100);
  }

  openAiMonitoringPanel(panel: StatsAiMonitoringPanel): void {
    this.selectedAiMonitoringPanel = panel;

    if (panel === 'recommendations' && this.isHr && !this.aiMonitoring && !this.aiMonitoringLoading) {
      this.loadAiMonitoring();
    }

    if (panel === 'hr-copilot' && this.isHr && !this.aiCopilotMonitoring && !this.aiCopilotMonitoringLoading) {
      this.loadAiCopilotMonitoring();
    }

    if (panel === 'planning' && !this.planningMonitoring && !this.planningMonitoringLoading) {
      this.loadPlanningMonitoring();
    }

    this.cdr.markForCheck();
  }

  closeAiMonitoringPanel(): void {
    this.selectedAiMonitoringPanel = null;
    this.cdr.markForCheck();
  }

  refreshAllAiMonitoring(): void {
    if (this.isHr) {
      this.loadAiMonitoring();
      this.loadAiCopilotMonitoring();
    }

    if (this.isHr || this.isManager) {
      this.loadPlanningMonitoring();
    }
  }

  refreshSelectedAiMonitoringPanel(): void {
    switch (this.selectedAiMonitoringPanel) {
      case 'recommendations':
        this.loadAiMonitoring();
        break;

      case 'hr-copilot':
        this.loadAiCopilotMonitoring();
        break;

      case 'planning':
        this.loadPlanningMonitoring();
        break;

      default:
        this.refreshAllAiMonitoring();
        break;
    }
  }

  get selectedAiMonitoringTitle(): string {
    switch (this.selectedAiMonitoringPanel) {
      case 'recommendations':
        return 'Monitoring recommandations';

      case 'hr-copilot':
        return 'Monitoring Assistant RH';

      case 'planning':
        return 'Monitoring Planning intelligent';

      default:
        return 'Monitoring IA';
    }
  }

  get selectedAiMonitoringSubtitle(): string {
    switch (this.selectedAiMonitoringPanel) {
      case 'recommendations':
        return 'Suivi des appels du moteur de recommandation et des événements les plus recommandés.';

      case 'hr-copilot':
        return 'Suivi des suggestions générées par l’Assistant RH, de l’usage Qwen et des retours utiles.';

      case 'planning':
        return 'Suivi des propositions générées, copiées et utilisées pour préremplir la création d’événement.';

      default:
        return 'Suivi des modules IA de CapEvents.';
    }
  }

  get recommendationMonitoringSummaryLabel(): string {
    if (this.aiMonitoringLoading) return 'Chargement...';
    if (this.aiMonitoringErrorMessage) return 'Erreur de chargement';
    if (!this.aiMonitoring) return 'Non chargé';

    return `${this.aiMonitoring.totalCalls} appel(s) · ${Math.round(this.aiSuccessRate)}% succès`;
  }

  get hrCopilotMonitoringSummaryLabel(): string {
    if (this.aiCopilotMonitoringLoading) return 'Chargement...';
    if (this.aiCopilotMonitoringError) return 'Erreur de chargement';
    if (!this.aiCopilotMonitoring) return 'Non chargé';

    return `${this.aiCopilotMonitoring.totalCalls} appel(s) · ${this.aiCopilotMonitoring.totalSuggestions} suggestion(s)`;
  }

  get planningMonitoringSummaryLabel(): string {
    if (this.planningMonitoringLoading) return 'Chargement...';
    if (this.planningMonitoringError) return 'Erreur de chargement';
    if (!this.planningMonitoring) return 'Non chargé';

    return `${this.planningMonitoring.totalGenerations} génération(s) · ${this.planningUsagePercent()}% usage`;
  }

  private pick<T = any>(source: any, camelKey: string, snakeKey: string, fallback: T): T {
    if (!source) return fallback;

    const camelValue = source[camelKey];
    const snakeValue = source[snakeKey];

    if (camelValue !== undefined && camelValue !== null) {
      return camelValue as T;
    }

    if (snakeValue !== undefined && snakeValue !== null) {
      return snakeValue as T;
    }

    return fallback;
  }

  private normalizeRecommendationMonitoring(response: any): AiRecommendationMonitoringSummary {
    return {
      totalCalls: this.pick<number>(response, 'totalCalls', 'total_calls', 0),
      successfulCalls: this.pick<number>(response, 'successfulCalls', 'successful_calls', 0),
      failedCalls: this.pick<number>(response, 'failedCalls', 'failed_calls', 0),
      totalRecommendations: this.pick<number>(response, 'totalRecommendations', 'total_recommendations', 0),
      lastModelName: this.pick<string | null>(response, 'lastModelName', 'last_model_name', null),
      lastModelVersion: this.pick<string | null>(response, 'lastModelVersion', 'last_model_version', null),

      topRecommendedEvents: this.pick<any[]>(response, 'topRecommendedEvents', 'top_recommended_events', [])
        .map(item => ({
          eventId: this.pick<string>(item, 'eventId', 'event_id', ''),
          title: this.pick<string | null>(item, 'title', 'title', null),
          category: this.pick<string | null>(item, 'category', 'category', null),
          count: this.pick<number>(item, 'count', 'count', 0)
        })),

      recentPredictions: this.pick<any[]>(response, 'recentPredictions', 'recent_predictions', [])
        .map(item => ({
          requestId: this.pick<string>(item, 'requestId', 'request_id', ''),
          createdAt: this.pick<string>(item, 'createdAt', 'created_at', ''),
          userId: this.pick<string>(item, 'userId', 'user_id', ''),
          status: this.pick<string>(item, 'status', 'status', ''),
          modelName: this.pick<string>(item, 'modelName', 'model_name', ''),
          modelVersion: this.pick<string>(item, 'modelVersion', 'model_version', ''),
          totalCandidates: this.pick<number>(item, 'totalCandidates', 'total_candidates', 0),
          recommendationsCount: this.pick<number>(item, 'recommendationsCount', 'recommendations_count', 0)
        }))
    };
  }

  private normalizeCopilotMonitoring(response: any): AiHrCopilotMonitoringResponse {
    return {
      totalCalls: this.pick<number>(response, 'totalCalls', 'total_calls', 0),
      successfulCalls: this.pick<number>(response, 'successfulCalls', 'successful_calls', 0),
      failedCalls: this.pick<number>(response, 'failedCalls', 'failed_calls', 0),
      totalSuggestions: this.pick<number>(response, 'totalSuggestions', 'total_suggestions', 0),

      qwenUsedCount: this.pick<number>(response, 'qwenUsedCount', 'qwen_used_count', 0),
      qwenUsageRate: this.pick<number>(response, 'qwenUsageRate', 'qwen_usage_rate', 0),

      feedbackCount: this.pick<number>(response, 'feedbackCount', 'feedback_count', 0),
      usefulFeedbackCount: this.pick<number>(response, 'usefulFeedbackCount', 'useful_feedback_count', 0),
      notUsefulFeedbackCount: this.pick<number>(response, 'notUsefulFeedbackCount', 'not_useful_feedback_count', 0),
      usefulnessRate: this.pick<number>(response, 'usefulnessRate', 'usefulness_rate', 0),

      topSuggestionTypes: this.pick<any[]>(response, 'topSuggestionTypes', 'top_suggestion_types', [])
        .map((item: any) => ({
          type: this.pick<string>(item, 'type', 'type', ''),
          count: this.pick<number>(item, 'count', 'count', 0)
        })),

      recentCalls: this.pick<any[]>(response, 'recentCalls', 'recent_calls', [])
        .map((item: any) => ({
          requestId: this.pick<string>(item, 'requestId', 'request_id', ''),
          createdAt: this.pick<string>(item, 'createdAt', 'created_at', ''),
          status: this.pick<string>(item, 'status', 'status', ''),
          suggestionsCount: this.pick<number>(item, 'suggestionsCount', 'suggestions_count', 0),
          suggestionTypes: this.pick<string[]>(item, 'suggestionTypes', 'suggestion_types', []),
          relatedEventIds: this.pick<string[]>(item, 'relatedEventIds', 'related_event_ids', []),
          qwenUsed: this.pick<boolean>(item, 'qwenUsed', 'qwen_used', false),
          summarySource: this.pick<string | null>(item, 'summarySource', 'summary_source', null),
          message: this.pick<string | null>(item, 'message', 'message', null)
        }))
    };
  }

  private normalizePlanningMonitoring(response: any): AiPlanningMonitoringSummary {
    return {
      periodDays: this.pick<number>(response, 'periodDays', 'period_days', 30),
      targetDepartmentId: this.pick<number | null>(response, 'targetDepartmentId', 'target_department_id', null),
      totalGenerations: this.pick<number>(response, 'totalGenerations', 'total_generations', 0),
      totalUsageEvents: this.pick<number>(response, 'totalUsageEvents', 'total_usage_events', 0),
      copiedCount: this.pick<number>(response, 'copiedCount', 'copied_count', 0),
      usedToPrefillCount: this.pick<number>(response, 'usedToPrefillCount', 'used_to_prefill_count', 0),
      createdFromAiCount: this.pick<number>(response, 'createdFromAiCount', 'created_from_ai_count', 0),
      usageRate: this.pick<number>(response, 'usageRate', 'usage_rate', 0),
      topCategories: this.pick<any[]>(response, 'topCategories', 'top_categories', []),
      topProposals: this.pick<any[]>(response, 'topProposals', 'top_proposals', []),
      modelVersions: this.pick<any[]>(response, 'modelVersions', 'model_versions', []),
      latestEvents: this.pick<any[]>(response, 'latestEvents', 'latest_events', [])
    };
  }


}