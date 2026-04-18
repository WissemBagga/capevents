import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { AdminAnalyticsOverviewResponse, EventEngagementResponse } from '../../../core/models/admin-analytics.model';
import { AdminAnalyticsService } from '../../../core/services/admin-analytics.service';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
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

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.adminAnalyticsService.getOverview()
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
}