import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PointService } from '../../../core/services/point.service';
import { MyPointsResponse, PointTransactionResponse } from '../../../core/models/points.model';

@Component({
  selector: 'app-my-points',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './my-points.html',
  styleUrl: './my-points.css'
})
export class MyPoints {
  private pointService = inject(PointService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  errorMessage = '';

  totalPoints = 0;
  weeklyPoints = 0;
  history: PointTransactionResponse[] = [];

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