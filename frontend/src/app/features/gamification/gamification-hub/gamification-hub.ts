import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MyPoints } from '../../points/my-points/my-points';
import { MyBadges } from '../my-badges/my-badges';
import { MyRewards } from '../../rewards/my-rewards/my-rewards';

type GamificationTab = 'points' | 'badges' | 'rewards';

@Component({
  selector: 'app-gamification-hub',
  standalone: true,
  imports: [MyPoints, MyBadges, MyRewards],
  templateUrl: './gamification-hub.html',
  styleUrl: './gamification-hub.css'
})
export class GamificationHub {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  activeTab: GamificationTab = 'points';

  tabs: { key: GamificationTab; label: string }[] = [
    { key: 'points', label: 'Mes points' },
    { key: 'badges', label: 'Mes badges' },
    { key: 'rewards', label: 'Mes récompenses' }
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const requestedTab = params.get('tab');

      if (this.isValidTab(requestedTab)) {
        this.activeTab = requestedTab;
        return;
      }

      this.activeTab = 'points';
      this.updateUrl('points', true);
    });
  }

  selectTab(tab: GamificationTab): void {
    this.activeTab = tab;
    this.updateUrl(tab);
  }

  get activeDescription(): string {
    switch (this.activeTab) {
      case 'points':
        return 'Consultez votre solde de points et l’historique de vos transactions.';
      case 'badges':
        return 'Suivez vos accomplissements et votre progression dans CapEvents.';
      case 'rewards':
        return 'Consultez vos récompenses disponibles et vos demandes d’échange.';
      default:
        return 'Suivez votre engagement dans CapEvents.';
    }
  }

  private updateUrl(tab: GamificationTab, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl
    });
  }

  private isValidTab(value: string | null): value is GamificationTab {
    return value === 'points' || value === 'badges' || value === 'rewards';
  }
}