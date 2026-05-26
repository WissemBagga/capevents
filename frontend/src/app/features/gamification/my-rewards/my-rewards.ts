import { ChangeDetectorRef, Component, inject, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';

import { RewardService } from '@core/services/reward.service';
import {
  MyRewardsResponse,
  RewardCatalogItemResponse,
  RewardRedemptionResponse
} from '@core/models/reward.model';
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

  @Input() embedded = false;

  data: MyRewardsResponse | null = null;
  loading = false;
  redeemingCode = '';
  errorMessage = '';
  successMessage = '';

  get totalExchangesCount(): number {
    return this.data?.history?.filter(h => h.status === 'COMPLETED').length || 0;
  }

  get userLevel() {
    const pts = this.data?.currentPoints || 0;
    if (pts <= 100) return { level: 1, label: 'Novice' };
    if (pts <= 300) return { level: 2, label: 'InitiÃ©' };
    if (pts <= 600) return { level: 3, label: 'Actif' };
    if (pts <= 1000) return { level: 4, label: 'Champion' };
    return { level: 5, label: 'LÃ©gende' };
  }

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
            'Impossible de charger le catalogue de rÃ©compenses.';
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
              ? `Votre demande pour "${response.rewardTitle}" a Ã©tÃ© enregistrÃ©e et transmise au RH.`
              : `RÃ©compense "${response.rewardTitle}" Ã©changÃ©e avec succÃ¨s.`;

          this.loadRewards();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible dâ€™Ã©changer cette rÃ©compense.';
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
      COMPLETED: 'ConfirmÃ©e',
      PENDING_HR_ACTION: 'En attente RH',
      REJECTED: 'RefusÃ©e'
    };

    return labels[status] || status;
  }

  getRewardIconSvg(title: string): string {
    const t = (title || '').toLowerCase();

    // Coffee/Breakfast
    if (t.includes('cafÃ©') || t.includes('petit-dÃ©jeuner') || t.includes('croissant') || t.includes('boisson') || t.includes('coffee') || t.includes('goÃ»ter')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
    }
    // Gift Card/Voucher
    if (t.includes('carte') || t.includes('bon') || t.includes('cadeau') || t.includes('chÃ¨que') || t.includes('gift') || t.includes('voucher') || t.includes('amazon') || t.includes('netflix')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
    }
    // Day off/Leave
    if (t.includes('journÃ©e') || t.includes('congÃ©') || t.includes('repos') || t.includes('libre') || t.includes('off') || t.includes('vacances') || t.includes('midi') || t.includes('matinÃ©e')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    }
    // Merchandise/Goodies
    if (t.includes('t-shirt') || t.includes('mug') || t.includes('goodies') || t.includes('stylo') || t.includes('sac') || t.includes('tote') || t.includes('casquette') || t.includes('gourde')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
    }
    // Training/Books
    if (t.includes('formation') || t.includes('cours') || t.includes('livre') || t.includes('learning') || t.includes('book') || t.includes('certif') || t.includes('confÃ©rence')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
    }
    // Default/Award
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`;
  }

  getRewardImageUrl(title: string): string {
    const t = (title || '').toLowerCase();

    if (t.includes('cafÃ©') || t.includes('petit') || t.includes('boisson') || t.includes('coffee') || t.includes('croissant')) {
      return '/images/rewards/coffee.png';
    }
    if (t.includes('parking') || t.includes('place') || t.includes('voiture') || t.includes('auto') || t.includes('stationnement')) {
      return '/images/rewards/parking.png';
    }
    if (t.includes('tÃ©lÃ©travail') || t.includes('remote') || t.includes('maison') || t.includes('home') || t.includes('journÃ©e')) {
      return '/images/rewards/remote.png';
    }

    return '/images/rewards/cadeau.png';
  }
}

