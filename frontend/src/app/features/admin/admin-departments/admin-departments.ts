import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { Department } from '../../../core/models/department.model';

@Component({
  selector: 'app-admin-departments',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-departments.html',
  styleUrl: './admin-departments.css'
})
export class AdminDepartments {
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

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
          this.departments = departments ?? [];
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || err?.error || 'Impossible de charger les départements.';
          this.cdr.markForCheck();
        }
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const name = this.form.get('name')?.value?.trim() || '';

    this.userService.createDepartment(name)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.successMessage = 'Département ajouté avec succès.';
          this.form.reset({ name: '' });
          this.loadDepartments();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || err?.error || 'Impossible d’ajouter le département.';
          this.cdr.markForCheck();
        }
      });
  }
}