import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';

import { BadgeService } from '../../../core/services/badge.service';
import { BadgeProgressResponse } from '../../../core/models/badge.model';
import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

@Component({
  selector: 'app-my-badges',
  standalone: true,
  imports: [DatePipe, ScrollToMessageDirective],
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
    if (!badge.target || badge.target <= 0) return 0;
    return Math.min(100, Math.round((badge.progress / badge.target) * 100));
  }

  trackByBadgeCode(_: number, item: BadgeProgressResponse): string {
    return item.code;
  }
}