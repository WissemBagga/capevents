import { Component, HostListener, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css'
})
export class LandingPage implements OnInit {
  publicStats = {
    totalEvents: 42,
    publishedEvents: 38,
    totalUsers: 256,
    totalParticipants: 856
  };
  isNavbarScrolled = false;

  private readonly navbarScrollThreshold = 70;

  ngOnInit(): void {
    this.updateNavbarState();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateNavbarState();
  }

  private updateNavbarState(): void {
    this.isNavbarScrolled = window.scrollY > this.navbarScrollThreshold;
  }

  ahmedBadges = [
    { title: 'Top Participant', description: 'Participer Ã  plus de 10 Ã©vÃ©nements', tone: 'gold', image: '/images/badges/badge-gold.svg', unlocked: true, target: 10, progress: 10, unlockedAt: '2025-11-23T14:00:00Z' },
    { title: 'Premier Pas', description: 'S\'inscrire Ã  son premier Ã©vÃ©nement', tone: 'blue', image: '/images/badges/badge-blue.svg', unlocked: true, target: 1, progress: 1, unlockedAt: '2025-06-15T09:30:00Z' },
    { title: 'On Fire', description: '5 Ã©vÃ©nements en un mois', tone: 'red', image: '/images/badges/badge-fire.svg', unlocked: true, target: 5, progress: 5, unlockedAt: '2025-08-10T11:00:00Z' },
    { title: 'Innovateur', description: 'Proposer un Ã©vÃ©nement approuvÃ©', tone: 'purple', image: '/images/badges/badge-idea.svg', unlocked: false, target: 1, progress: 0 },
    { title: 'Critique Constructif', description: 'Laisser 20 feedbacks dÃ©taillÃ©s', tone: 'teal', image: '/images/badges/badge-feedback.svg', unlocked: false, target: 20, progress: 14 },
    { title: 'Chasseur de RÃ©compenses', description: 'Ã‰changer ses points', tone: 'orange', image: '/images/badges/badge-gift.svg', unlocked: false, target: 1, progress: 0 }
  ];

  wissemPoints = 120;
  wissemRewards = [
    { title: 'Parking', description: 'Avantage parking / accÃ¨s parking', pointsCost: 300, affordable: true, requiresHrAction: true },
    { title: 'JournÃ©e TÃ©lÃ©travail', description: 'Un jour de tÃ©lÃ©travail supplÃ©mentaire', pointsCost: 500, affordable: true, requiresHrAction: true },
    { title: 'CafÃ©', description: 'Bon cafÃ© ou boisson', pointsCost: 100, affordable: false, requiresHrAction: true },
    { title: 'Bon cadeau', description: 'Bon cadeau entreprise', pointsCost: 400, affordable: true, requiresHrAction: false }
  ];


  heroEvents = [
    { title: 'Tournoi Gaming Inter-DÃ©partements', registrations: 48, status: 'PubliÃ©', type: 'blue' as const },
    { title: 'Hackathon Innovation 2026', registrations: 36, status: 'Suivi', type: 'violet' as const },
    { title: 'Team Building Outdoor', registrations: 24, status: 'TerminÃ©', type: 'teal' as const }
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

