import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';

import { RewardService } from '../../../core/services/reward.service';
import {
  MyRewardsResponse,
  RewardCatalogItemResponse,
  RewardRedemptionResponse
} from '../../../core/models/reward.model';
import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

@Component({
  selector: 'app-my-rewards',
  standalone: true,
  imports: [DatePipe, ScrollToMessageDirective],
  templateUrl: './my-rewards.html',
  styleUrl: './my-rewards.css'
})
export class MyRewards {
  private rewardService = inject(RewardService);
  private cdr = inject(ChangeDetectorRef);

  data: MyRewardsResponse | null = null;
  loading = false;
  redeemingCode = '';
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadRewards();
  }

  loadRewards(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.rewardService.getMyRewards()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.data = response;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.data = null;
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger le catalogue de récompenses.';
          this.cdr.markForCheck();
        }
      });
  }

  redeem(reward: RewardCatalogItemResponse): void {
    if (!reward.affordable || this.redeemingCode) {
      return;
    }

    const confirmed = window.confirm(
      `Utiliser ${reward.pointsCost} points pour "${reward.title}" ?`
    );

    if (!confirmed) {
      return;
    }

    this.redeemingCode = reward.code;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.rewardService.redeemReward(reward.code)
      .pipe(finalize(() => {
        this.redeemingCode = '';
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response: RewardRedemptionResponse) => {
          this.successMessage =
            response.status === 'PENDING_HR_ACTION'
              ? `Votre demande pour "${response.rewardTitle}" a été enregistrée et transmise au RH.`
              : `Récompense "${response.rewardTitle}" échangée avec succès.`;

          this.loadRewards();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible d’échanger cette récompense.';
          this.cdr.markForCheck();
        }
      });
  }

  isRedeeming(rewardCode: string): boolean {
    return this.redeemingCode === rewardCode;
  }

  trackByRewardCode(_: number, item: RewardCatalogItemResponse): string {
    return item.code;
  }

  trackByHistoryId(_: number, item: RewardRedemptionResponse): number {
    return item.id;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      COMPLETED: 'Confirmée',
      PENDING_HR_ACTION: 'En attente RH',
      REJECTED: 'Refusée'
    };

    return labels[status] || status;
  }
}