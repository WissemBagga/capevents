import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { UserSummary } from '../../../core/models/user-summary.model';
import { PageResponse } from '../../../core/models/page-response.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule],
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

  ngOnInit(): void {
    this.loadUsers();
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
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || err?.error || 'Impossible de charger les utilisateurs.';
          this.cdr.markForCheck();
        }
      });
  }

  getPrimaryRole(user: UserSummary): string {
    if (user.roles.includes('ROLE_HR')) return 'ROLE_HR';
    if (user.roles.includes('ROLE_MANAGER')) return 'ROLE_MANAGER';
    return 'ROLE_EMPLOYEE';
  }

  changeRole(user: UserSummary, roleCode: string): void {
    if (!roleCode || roleCode === this.getPrimaryRole(user)) {
      return;
    }

    this.savingRoleByUserId[user.id] = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService.updateUserRole(user.id, roleCode)
      .pipe(finalize(() => {
        this.savingRoleByUserId[user.id] = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (updatedUser) => {
          this.users = this.users.map(item => item.id === updatedUser.id ? updatedUser : item);
          this.successMessage = `Rôle mis à jour pour ${updatedUser.firstName} ${updatedUser.lastName}.`;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || err?.error || 'Impossible de modifier le rôle.';
          this.cdr.markForCheck();
        }
      });
  }
}