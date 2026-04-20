import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { AdminAnalyticsOverviewResponse, EventEngagementResponse } from '../../../core/models/admin-analytics.model';
import { AdminAnalyticsService } from '../../../core/services/admin-analytics.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [RouterLink, DecimalPipe, FormsModule ],
  templateUrl: './admin-stats.html',
  styleUrl: './admin-stats.css',
})
export class AdminStats {
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private adminAnalyticsService = inject(AdminAnalyticsService);

  analytics: AdminAnalyticsOverviewResponse | null = null;

  loading = false;
  errorMessage = '';

  filters = {
    from: '',
    to: '',
    departmentId: null as number | null,
    category: ''
  };

  ngOnInit(): void {
    this.loadAnalytics();
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

  get maxMonthlyRegistrations(): number {
    if (!this.analytics?.monthlyTrend?.length) return 1;
    return Math.max(...this.analytics.monthlyTrend.map(item => item.registrations), 1);
  }

  barWidth(value: number, max: number): string {
    if (max <= 0) return '0%';
    return `${Math.max(8, (value / max) * 100)}%`;
  }

  trackByTopMember(_: number, item: { email: string }): string {
    return item.email;
  }

  trackByDepartment(_: number, item: { departmentId: number }): number {
    return item.departmentId;
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
}