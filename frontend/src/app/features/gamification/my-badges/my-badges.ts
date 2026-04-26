import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';

import { BadgeService } from '../../../core/services/badge.service';
import { BadgeProgressResponse } from '../../../core/models/badge.model';
import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

import { DecimalPipe } from '@angular/common';


@Component({
  selector: 'app-my-badges',
  standalone: true,
  imports: [DatePipe, ScrollToMessageDirective, DecimalPipe],
  templateUrl: './my-badges.html',
  styleUrl: './my-badges.css'
})
export class MyBadges {
  private badgeService = inject(BadgeService);
  private cdr = inject(ChangeDetectorRef);

  badges: BadgeProgressResponse[] = [];
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadBadges();
  }

  loadBadges(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.badgeService.getMyBadges()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.badges = response.badges ?? [];
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.badges = [];
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger vos badges.';
          this.cdr.markForCheck();
        }
      });
  }

  progressPercent(badge: BadgeProgressResponse): number {
    if (this.isBadgeUnlocked(badge)) {
      return 100;
    }

    if (!badge.target || badge.target <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((badge.progress / badge.target) * 100));
  }

  isBadgeUnlocked(badge: BadgeProgressResponse): boolean {
    if (badge.unlocked) {
      return true;
    }

    if (badge.target && badge.target > 0 && badge.progress >= badge.target) {
      return true;
    }

    return false;
  }

  trackByBadgeCode(_: number, item: BadgeProgressResponse): string {
    return item.code;
  }

  private normalizeBadgeKey(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
  }

  private resolveBadgeFamily(badge: BadgeProgressResponse): 'blue' | 'fire' | 'idea' | 'gold' | 'feedback' | 'gift' {
    const code = this.normalizeBadgeKey(badge.code);
    const title = this.normalizeBadgeKey(badge.title);

    if (
      ['FIRST_STEP', 'FIRST_EVENT', 'FIRST_PARTICIPATION', 'FIRST_REGISTERED_EVENT'].includes(code) ||
      title.includes('FIRST_STEP') ||
      title.includes('PREMIER') ||
      title.includes('FIRST')
    ) {
      return 'blue';
    }

    if (
      ['ON_FIRE', 'ATTENDANCE_STAR', 'STREAK', 'FIVE_EVENTS_MONTH'].includes(code) ||
      title.includes('ON_FIRE') ||
      title.includes('FIRE')
    ) {
      return 'fire';
    }

    if (
      ['INNOVATOR', 'INNOVATEUR', 'EVENT_EXPLORER', 'FIRST_APPROVED_PROPOSAL'].includes(code) ||
      title.includes('INNOV') ||
      title.includes('EXPLOR')
    ) {
      return 'idea';
    }

    if (
      ['CHAMPION', 'TOP_PARTICIPANT', 'PARTICIPATION_CHAMPION', 'TEN_EVENTS'].includes(code) ||
      title.includes('CHAMPION')
    ) {
      return 'gold';
    }

    if (
      ['CRITIQUE', 'FEEDBACK_CHAMPION', 'TWENTY_FEEDBACKS', 'FEEDBACK_STAR'].includes(code) ||
      title.includes('CRITIQUE') ||
      title.includes('FEEDBACK')
    ) {
      return 'feedback';
    }

    if (
      ['REWARD_HUNTER', 'REWARD_REDEEMER', 'GIFT_MASTER'].includes(code) ||
      title.includes('REWARD') ||
      title.includes('CADEAU') ||
      title.includes('GIFT')
    ) {
      return 'gift';
    }

    return 'gold';
  }

  getBadgeImage(badge: BadgeProgressResponse): string {
    const family = this.resolveBadgeFamily(badge);

    const map: Record<string, string> = {
      blue: '/images/badges/badge-blue.svg',
      fire: '/images/badges/badge-fire.svg',
      idea: '/images/badges/badge-idea.svg',
      gold: '/images/badges/badge-gold.svg',
      feedback: '/images/badges/badge-feedback.svg',
      gift: '/images/badges/badge-gift.svg'
    };

    return map[family] || '/images/badges/badge-gold.svg';
  }

  getBadgeTone(badge: BadgeProgressResponse): string {
    const family = this.resolveBadgeFamily(badge);

    const tones: Record<string, string> = {
      blue: 'blue',
      fire: 'red',
      idea: 'purple',
      gold: 'gold',
      feedback: 'teal',
      gift: 'orange'
    };

    return tones[family] || 'gold';
  }
}