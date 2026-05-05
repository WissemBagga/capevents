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

import { AiHrCopilotService } from '../../../../core/services/ai-hr-copilot.service';
import { AiHrCopilotResponse } from '../../../../core/models/ai-hr-copilot.model';

type TrendPointVm = {
  month: string;
  registrations: number;
  x: number;
  y: number;
};

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
  private aiHrCopilotService = inject(AiHrCopilotService);


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

  aiCopilot: AiHrCopilotResponse | null = null;
  aiCopilotLoading = false;
  aiCopilotError = '';

  ngOnInit(): void {
    if (this.isHr) {
      this.loadDepartments();
      this.loadAiMonitoring();
      this.loadAiCopilot();
    }
    this.loadAnalytics();
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
          this.aiMonitoring = response;
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

  loadAiCopilot(): void {
    if (!this.isHr) return;

    this.aiCopilotLoading = true;
    this.aiCopilotError = '';
    this.cdr.markForCheck();

    this.aiHrCopilotService.getSuggestions()
      .pipe(finalize(() => {
        this.aiCopilotLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (res) => {
          this.aiCopilot = res;
          this.cdr.markForCheck();
        },
        error: () => {
          this.aiCopilot = null;
          this.aiCopilotError = 'Impossible de charger le copilote IA.';
          this.cdr.markForCheck();
        }
      });
  }

}