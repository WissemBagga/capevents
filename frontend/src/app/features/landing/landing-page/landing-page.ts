import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css'
})
export class LandingPage {
  // Static realistic data for the public landing page
  // No API call needed — this page is public and doesn't require authentication
  stats = {
    totalEvents: 42,
    publishedEvents: 38,
    totalRegistrations: 856,
    totalCapacity: 1200,
    registrationRate: 71,
    totalPresent: 694,
    attendanceRate: 81,
    totalFeedbacks: 312,
    averageRating: 4.3
  };

  // Static badges for the landing page showcase
  showcaseBadges = [
    { icon: '🏅', name: 'Top Participant', description: 'Participer à plus de 10 événements', tone: 'gold' },
    { icon: '🎯', name: 'Premier Pas', description: 'S\'inscrire à son premier événement', tone: 'blue' },
    { icon: '🔥', name: 'On Fire', description: '5 événements en un mois', tone: 'red' },
    { icon: '💡', name: 'Innovateur', description: 'Proposer un événement approuvé', tone: 'purple' },
    { icon: '⭐', name: 'Critique Constructif', description: 'Laisser 20 feedbacks détaillés', tone: 'teal' },
    { icon: '🎁', name: 'Chasseur de Récompenses', description: 'Échanger ses points contre une récompense', tone: 'orange' }
  ];

  // Static event showcase
  heroEvents = [
    { title: 'Tournoi Gaming Inter-Départements', registrations: 48, status: 'Publié', type: 'blue' as const },
    { title: 'Hackathon Innovation 2026', registrations: 36, status: 'Suivi', type: 'violet' as const },
    { title: 'Team Building Outdoor', registrations: 24, status: 'Terminé', type: 'teal' as const }
  ];

  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  formatPercent(value: number): string {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)}%`;
  }

  formatRating(value: number): string {
    return `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value)}/5`;
  }

  progressWidth(value: number): string {
    return `${Math.max(8, Math.min(Math.round(value), 100))}%`;
  }

  get suggestionMatch(): number {
    return Math.max(1, Math.min(98, Math.round(this.stats.attendanceRate)));
  }
}