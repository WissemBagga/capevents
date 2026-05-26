import { ChangeDetectorRef, Component, inject, Input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { UserService } from '@core/services/user.service';
import { Department } from '@core/models/department.model';
import { ScrollToMessageDirective } from '../../../../shared/directives/scroll-to-message.directive';

@Component({
  selector: 'app-admin-departments',
  standalone: true,
  imports: [ReactiveFormsModule, ScrollToMessageDirective],
  templateUrl: './admin-departments.html',
  styleUrl: './admin-departments.css'
})
export class AdminDepartments {
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  @Input() embedded = false;

  departments: Department[] = [];
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]]
  });

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.loading = true;
    this.errorMessage = '';

    this.userService.getDepartments()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (departments) => {
          this.departments = this.sortDepartments(departments ?? []);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || err?.error || 'Impossible de charger les dÃ©partements.';
          this.cdr.markForCheck();
        }
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const name = this.form.get('name')?.value?.trim() || '';

    if (!name) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.departmentExistsLocally(name)) {
      this.errorMessage = 'Ce dÃ©partement existe dÃ©jÃ .';
      this.successMessage = '';
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService.createDepartment(name)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.successMessage = 'DÃ©partement ajoutÃ© avec succÃ¨s.';
          this.form.reset({ name: '' });
          this.loadDepartments();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || err?.error || 'Impossible dâ€™ajouter le dÃ©partement.';
          this.cdr.markForCheck();
        }
      });
  }

  private normalizeDepartmentName(value: string): string {
    return value
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  private sortDepartments(items: Department[]): Department[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }

  private departmentExistsLocally(name: string): boolean {
    const normalized = this.normalizeDepartmentName(name);

    return this.departments.some(
      department => this.normalizeDepartmentName(department.name) === normalized
    );
  }
}
