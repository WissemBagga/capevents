import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { AdminDepartments } from '../../admin/departments/admin-departments/admin-departments';
import { AdminUsers } from '../../admin/users/admin-users/admin-users';
import { MyInterests } from '../../interests/my-interests/my-interests';
import { MyProfile } from '../../profile/my-profile/my-profile';

type SettingsTab = 'departments' | 'users' | 'interests' | 'profile';

interface SettingsTabItem {
  key: SettingsTab;
  label: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-settings-hub',
  standalone: true,
  imports: [
    AdminDepartments,
    AdminUsers,
    MyInterests,
    MyProfile
  ],
  templateUrl: './settings-hub.html',
  styleUrl: './settings-hub.css'
})
export class SettingsHub {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  activeTab: SettingsTab = 'profile';

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const requested = params.get('tab') as SettingsTab | null;
      const nextTab = requested && this.canAccessTab(requested)
        ? requested
        : this.defaultTab;

      this.activeTab = nextTab;
    });
  }

  get isHr(): boolean {
    return this.authService.isHr();
  }

  get tabs(): SettingsTabItem[] {
    const allTabs: SettingsTabItem[] = [
      { key: 'departments', label: 'Départements', adminOnly: true },
      { key: 'users', label: 'Utilisateurs & rôles', adminOnly: true },
      { key: 'interests', label: 'Mes intérêts' },
      { key: 'profile', label: 'Mon profil' }
    ];

    return allTabs.filter(tab => !tab.adminOnly || this.isHr);
  }

  get defaultTab(): SettingsTab {
    return this.isHr ? 'departments' : 'interests';
  }

  selectTab(tab: SettingsTab): void {
    if (!this.canAccessTab(tab)) return;

    this.activeTab = tab;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  private canAccessTab(tab: SettingsTab): boolean {
    if (tab === 'departments' || tab === 'users') {
      return this.isHr;
    }

    return ['interests', 'profile'].includes(tab);
  }

  get activeDescription(): string {
    switch (this.activeTab) {
      case 'departments':
        return 'Gérez la liste des départements au sein de l’organisation.';
      case 'users':
        return 'Gérez les rôles métier et les accès des utilisateurs.';
      case 'interests':
        return 'Personnalisez vos centres d’intérêt pour améliorer les recommandations.';
      case 'profile':
        return 'Mettez à jour vos informations personnelles et votre avatar.';
      default:
        return 'Gérez vos préférences et la sécurité de votre compte.';
    }
  }
}