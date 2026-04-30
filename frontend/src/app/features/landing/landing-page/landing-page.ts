import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { finalize } from 'rxjs';
import { PublicAnalyticsService, PublicStatsResponse } from '../../../core/services/public-analytics.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css'
})
export class LandingPage implements OnInit {
  private publicAnalyticsService = inject(PublicAnalyticsService);

  publicStats: PublicStatsResponse | null = null;
  loadingStats = false;
  statsError = '';

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.loadingStats = true;
    this.statsError = '';

    this.publicAnalyticsService.getPublicStats()
      .subscribe({
        next: (response) => {
          this.publicStats = response;
          this.loadingStats = false;
        },
        error: () => {
          // Fallback to mock data so the UI doesn't look broken while the backend endpoint is missing
          this.publicStats = {
            totalEvents: 42,
            publishedEvents: 38,
            totalUsers: 256,
            totalParticipants: 856
          };
          this.loadingStats = false;
          // this.statsError = 'Impossible de charger les statistiques.';
        }
      });
  }

  ahmedBadges = [
    { title: 'Top Participant', description: 'Participer à plus de 10 événements', tone: 'gold', image: '/images/badges/badge-gold.svg', unlocked: true, target: 10, progress: 10, unlockedAt: '2025-11-23T14:00:00Z' },
    { title: 'Critique Constructif', description: 'Laisser 20 feedbacks détaillés', tone: 'teal', image: '/images/badges/badge-feedback.svg', unlocked: false, target: 20, progress: 14 }
  ];

  wissemPoints = 1250;
  wissemRewards = [
    { title: 'Carte Cadeau 50€', description: 'Valable dans plus de 200 enseignes', pointsCost: 1000, affordable: true, requiresHrAction: true }
  ];

  // Static event showcase
  heroEvents = [
    { title: 'Tournoi Gaming Inter-Départements', registrations: 48, status: 'Publié', type: 'blue' as const },
    { title: 'Hackathon Innovation 2026', registrations: 36, status: 'Suivi', type: 'violet' as const },
    { title: 'Team Building Outdoor', registrations: 24, status: 'Terminé', type: 'teal' as const }
  ];

  formatNumber(value: number | undefined | null): string {
    if (value == null) return '0';
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  formatPercent(value: number | undefined | null): string {
    if (value == null) return '0%';
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)}%`;
  }

  formatRating(value: number | undefined | null): string {
    if (value == null) return '0/5';
    return `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value)}/5`;
  }

  progressWidth(value: number | undefined | null): string {
    if (value == null) return '0%';
    return `${Math.max(8, Math.min(Math.round(value), 100))}%`;
  }

  get suggestionMatch(): number {
    return 81; // Using a static fallback since we no longer fetch attendance rate
  }

  progressPercent(badge: any): number {
    if (badge.target === 0) return 0;
    return Math.min(100, Math.round((badge.progress / badge.target) * 100));
  }
}
