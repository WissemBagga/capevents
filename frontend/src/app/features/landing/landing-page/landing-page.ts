import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AdminAnalyticsService } from '../../../core/services/admin-analytics.service';
import {
  AdminAnalyticsOverviewResponse,
  EventEngagementResponse
} from '../../../core/models/admin-analytics.model';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css'
})
export class LandingPage {
  private adminAnalyticsService = inject(AdminAnalyticsService);

  analytics: AdminAnalyticsOverviewResponse | null = null;
  loadingStats = false;
  statsError = '';

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.loadingStats = true;
    this.statsError = '';

    this.adminAnalyticsService.getOverview({
      from: '',
      to: '',
      departmentId: null,
      category: ''
    })
    .pipe(finalize(() => this.loadingStats = false))
    .subscribe({
      next: (response) => {
        this.analytics = response;
      },
      error: () => {
        this.analytics = null;
        this.statsError = 'Impossible de charger les statistiques.';
      }
    });
  }

  safeNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '0';
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  safePercent(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '0%';
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)}%`;
  }

  safeRating(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '0/5';
    return `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value)}/5`;
  }

  formatPercent(value: number | null | undefined): string {
    return this.safePercent(value);
  }

  progressWidth(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '0%';
    return `${Math.max(8, Math.min(Math.round(value), 100))}%`;
  }

  get suggestionMatch(): number {
    const rate = this.analytics?.attendanceRate ?? this.analytics?.registrationRate ?? 0;
    return Math.max(1, Math.min(98, Math.round(rate)));
  }

  get topEngagingEvents(): EventEngagementResponse[] {
    return [...(this.analytics?.topEngagingEvents ?? [])]
      .sort((a, b) => {
        if (b.attendanceRate !== a.attendanceRate) return b.attendanceRate - a.attendanceRate;
        if (b.presentCount !== a.presentCount) return b.presentCount - a.presentCount;
        return b.registeredCount - a.registeredCount;
      })
      .slice(0, 3);
  }

  get topMembers() {
    return [...(this.analytics?.topMembers ?? [])]
      .sort((a, b) => {
        if (b.attendanceRate !== a.attendanceRate) return b.attendanceRate - a.attendanceRate;
        if (b.presentCount !== a.presentCount) return b.presentCount - a.presentCount;
        return a.fullName.localeCompare(b.fullName, 'fr');
      })
      .slice(0, 3);
  }

  get heroPrimaryEventTitle(): string {
    return this.topEngagingEvents[0]?.title || 'Tournoi Gaming';
  }

  get heroPrimaryRegistrations(): number {
    return this.topEngagingEvents[0]?.registeredCount ?? this.analytics?.totalRegistrations ?? 0;
  }

  get heroSecondaryEventTitle(): string {
    return this.topEngagingEvents[1]?.title || 'Hackathon Innovation';
  }

  get recommendedEventTitle(): string {
    return this.topEngagingEvents[0]?.title || 'Tournoi Gaming Inter-Départements';
  }
}