import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { UserSummary } from '../../../core/models/user-summary.model';
import { PageResponse } from '../../../core/models/page-response.model';
import { FormsModule } from '@angular/forms';
import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule, ScrollToMessageDirective],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css'
})
export class AdminUsers {
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);

  users: UserSummary[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  roleOptions = [
    { value: 'ROLE_EMPLOYEE', label: 'Employé' },
    { value: 'ROLE_MANAGER', label: 'Manager' },
    { value: 'ROLE_HR', label: 'RH' }
  ];

  savingRoleByUserId: Record<string, boolean> = {};
  selectedRoleByUserId: Record<string, string> = {};
  showHrWarningByUserId: Record<string, boolean> = {};
  confirmHrPromotionByUserId: Record<string, boolean> = {};

  searchTerm = '';
  selectedRoleFilter = '';
  selectedDepartmentFilter = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const httpErr = err as HttpErrorResponse;

    if (httpErr?.error instanceof ProgressEvent || httpErr?.status === 0) {
      return 'Impossible de contacter le serveur. Vérifiez que le backend est lancé et accessible.';
    }

    if (typeof httpErr?.error === 'string' && httpErr.error.trim()) {
      return httpErr.error;
    }

    if (httpErr?.error?.message) {
      return httpErr.error.message;
    }

    if (httpErr?.message) {
      return httpErr.message;
    }

    return fallback;
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.userService.getAllUsers(0, 1000, 'firstName', 'asc')
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response: PageResponse<UserSummary>) => {
          this.users = response.items ?? [];

          for (const user of this.users) {
            this.selectedRoleByUserId[user.id] = this.getPrimaryRole(user);
            this.showHrWarningByUserId[user.id] = false;
            this.confirmHrPromotionByUserId[user.id] = false;
          }

          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = this.extractErrorMessage(
            err,
            'Impossible de charger les utilisateurs.'
          );
          this.cdr.markForCheck();
        }
      });
  }

  getPrimaryRole(user: UserSummary): string {
    if (user.roles.includes('ROLE_HR')) return 'ROLE_HR';
    if (user.roles.includes('ROLE_MANAGER')) return 'ROLE_MANAGER';
    return 'ROLE_EMPLOYEE';
  }

  onRoleSelectionChange(user: UserSummary, roleCode: string): void {
    this.selectedRoleByUserId[user.id] = roleCode;
    this.errorMessage = '';
    this.successMessage = '';

    const promotingToHr =
      roleCode === 'ROLE_HR' && this.getPrimaryRole(user) !== 'ROLE_HR';

    this.showHrWarningByUserId[user.id] = promotingToHr;

    if (!promotingToHr) {
      this.confirmHrPromotionByUserId[user.id] = false;
    }

    this.cdr.markForCheck();
  }

  isPromotingToHr(user: UserSummary): boolean {
    return this.selectedRoleByUserId[user.id] === 'ROLE_HR'
      && this.getPrimaryRole(user) !== 'ROLE_HR';
  }

  canSaveRole(user: UserSummary): boolean {
    const selectedRole = this.selectedRoleByUserId[user.id];
    const currentRole = this.getPrimaryRole(user);

    if (!selectedRole) {
      return false;
    }

    if (selectedRole === currentRole && !this.needsParticipationRoleRepair(user)) {
      return false;
    }

    if (this.isPromotingToHr(user) && !this.confirmHrPromotionByUserId[user.id]) {
      return false;
    }

    return !this.savingRoleByUserId[user.id];
  }

  saveRole(user: UserSummary): void {
    const roleCode = this.selectedRoleByUserId[user.id];

    if (!roleCode) {
      return;
    }

    const currentRole = this.getPrimaryRole(user);
    const repairingParticipationAccess =
      roleCode === currentRole && this.needsParticipationRoleRepair(user);

    if (roleCode === currentRole && !repairingParticipationAccess) {
      return;
    }

    const confirmHrPromotion = this.isPromotingToHr(user)
      ? !!this.confirmHrPromotionByUserId[user.id]
      : false;

    this.savingRoleByUserId[user.id] = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService.updateUserRole(user.id, roleCode, confirmHrPromotion)
      .pipe(finalize(() => {
        this.savingRoleByUserId[user.id] = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (updatedUser) => {
          this.users = this.users.map(item => item.id === updatedUser.id ? updatedUser : item);

          this.selectedRoleByUserId[updatedUser.id] = this.getPrimaryRole(updatedUser);
          this.showHrWarningByUserId[updatedUser.id] = false;
          this.confirmHrPromotionByUserId[updatedUser.id] = false;

          this.successMessage = repairingParticipationAccess
          ? `Accès Participation réactivé pour ${updatedUser.firstName} ${updatedUser.lastName}. Email et notification envoyés.`
          : `Rôle mis à jour pour ${updatedUser.firstName} ${updatedUser.lastName}. Email et notification envoyés.`;

          this.cdr.markForCheck();
        },
        error: (err) => {
          const rawMessage = this.extractErrorMessage(
            err,
            'Impossible de modifier le rôle.'
          );

          this.errorMessage = this.mapRoleErrorMessage(rawMessage);
          this.cdr.markForCheck();
        }
      });
  }

  getAvatarUrl(user: UserSummary): string | null {
    const avatar = user.avatarUrl?.trim();
    return avatar ? avatar : null;
  }

  needsParticipationRoleRepair(user: UserSummary): boolean {
    const primaryRole = this.getPrimaryRole(user);

    return (primaryRole === 'ROLE_MANAGER' || primaryRole === 'ROLE_HR')
      && !user.roles.includes('ROLE_EMPLOYEE');
  }

  getInitials(user: UserSummary): string {
    const first = user.firstName?.trim()?.charAt(0) ?? '';
    const last = user.lastName?.trim()?.charAt(0) ?? '';
    const initials = `${first}${last}`.toUpperCase();
    return initials || 'U';
  }

  get departmentOptions(): string[] {
    return Array.from(
      new Set(
        this.users
          .map(user => user.departmentName?.trim())
          .filter((value): value is string => !!value)
      )
    ).sort((a, b) => a.localeCompare(b));
  }

  get filteredUsers(): UserSummary[] {
    const search = this.searchTerm.trim().toLowerCase();
    const roleFilter = this.selectedRoleFilter;
    const departmentFilter = this.selectedDepartmentFilter;

    return this.users.filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      const department = (user.departmentName || '').toLowerCase();
      const primaryRole = this.getPrimaryRole(user);

      const matchesSearch =
        !search ||
        fullName.includes(search) ||
        email.includes(search) ||
        department.includes(search);

      const matchesRole =
        !roleFilter || primaryRole === roleFilter;

      const matchesDepartment =
        !departmentFilter || (user.departmentName || '') === departmentFilter;

      return matchesSearch && matchesRole && matchesDepartment;
    });
  }

  get hasActiveFilters(): boolean {
    return !!this.searchTerm.trim() || !!this.selectedRoleFilter || !!this.selectedDepartmentFilter;
  }

  resetLocalFilters(): void {
    this.searchTerm = '';
    this.selectedRoleFilter = '';
    this.selectedDepartmentFilter = '';
    this.cdr.markForCheck();
  }

  displayRoles(user: UserSummary): string[] {
    const order = ['ROLE_HR', 'ROLE_MANAGER', 'ROLE_EMPLOYEE'];
    return [...user.roles].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  getRoleBadgeLabel(role: string): string {
    const labels: Record<string, string> = {
      ROLE_EMPLOYEE: 'Employé',
      ROLE_MANAGER: 'Manager',
      ROLE_HR: 'RH'
    };

    return labels[role] || role;
  }

  getRoleBadgeClass(role: string): string {
    const classes: Record<string, string> = {
      ROLE_EMPLOYEE: 'role-badge employee',
      ROLE_MANAGER: 'role-badge manager',
      ROLE_HR: 'role-badge hr'
    };

    return classes[role] || 'role-badge';
  }

  private mapRoleErrorMessage(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('manager') && lower.includes('department')) {
      return 'Ce département a déjà un manager actif.';
    }

    if (
      lower.includes('dernier rh') ||
      lower.includes('at least one hr') ||
      lower.includes('au moins un rh')
    ) {
      return 'Impossible de retirer le dernier RH de la plateforme.';
    }

    if (lower.includes('confirmation') && lower.includes('rh')) {
      return 'Veuillez confirmer explicitement la promotion vers le rôle RH.';
    }

    return message;
  }

}