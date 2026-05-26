import { ChangeDetectorRef, Component, inject, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PointService } from '@core/services/point.service';
import { MyPointsResponse, PointTransactionResponse } from '@core/models/points.model';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

@Component({
  selector: 'app-my-points',
  standalone: true,
  imports: [DatePipe, RouterLink, ScrollToMessageDirective],
  templateUrl: './my-points.html',
  styleUrl: './my-points.css'
})
export class MyPoints {
  private pointService = inject(PointService);
  private cdr = inject(ChangeDetectorRef);

  @Input() embedded = false;

  loading = false;
  errorMessage = '';

  totalPoints = 0;
  weeklyPoints = 0;
  history: PointTransactionResponse[] = [];

  get userLevel() {
    const pts = this.totalPoints;
    if (pts <= 100) return { level: 1, label: 'Novice', min: 0, max: 100, progress: pts };
    if (pts <= 300) return { level: 2, label: 'Initié', min: 100, max: 300, progress: Math.round(((pts - 100) / 200) * 100) };
    if (pts <= 600) return { level: 3, label: 'Actif', min: 300, max: 600, progress: Math.round(((pts - 300) / 300) * 100) };
    if (pts <= 1000) return { level: 4, label: 'Champion', min: 600, max: 1000, progress: Math.round(((pts - 600) / 400) * 100) };
    return { level: 5, label: 'Légende', min: 1000, max: 2000, progress: Math.min(100, Math.round(((pts - 1000) / 1000) * 100)) };
  }

  ngOnInit(): void {
    this.loadPoints();
  }

  loadPoints(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.pointService.getMyPoints(20)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response: MyPointsResponse) => {
          this.totalPoints = response.totalPoints ?? 0;
          this.history = response.history ?? [];
          this.calculateWeeklyPoints();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.totalPoints = 0;
          this.history = [];
          this.weeklyPoints = 0;
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger vos points.';
          this.cdr.markForCheck();
        }
      });
  }

  private calculateWeeklyPoints(): void {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    this.weeklyPoints = this.history
      .filter(item => new Date(item.createdAt) >= sevenDaysAgo && item.pointsDelta > 0)
      .reduce((sum, item) => sum + item.pointsDelta, 0);
  }

  isPositive(pointsDelta: number): boolean {
    return pointsDelta > 0;
  }

  formatDelta(pointsDelta: number): string {
    return pointsDelta > 0 ? `+${pointsDelta}` : `${pointsDelta}`;
  }

  trackByTransactionId(_: number, item: PointTransactionResponse): number {
    return item.id;
  }
}
