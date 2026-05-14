import { Component } from '@angular/core';

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
  activeTab: GamificationTab = 'points';

  tabs: { key: GamificationTab; label: string }[] = [
    { key: 'points', label: 'Mes points' },
    { key: 'badges', label: 'Mes badges' },
    { key: 'rewards', label: 'Mes récompenses' }
  ];

  selectTab(tab: GamificationTab): void {
    this.activeTab = tab;
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
}