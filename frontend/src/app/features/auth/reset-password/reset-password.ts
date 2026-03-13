import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  private route = inject(ActivatedRoute)

  loading = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]]
  });
  token = '';


  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.errorMessage = 'Token de réinitialisation manquant ou invalide.';
    }
  }

  onSubmit(): void {
    if (!this.token) {
      this.errorMessage = 'Token de réinitialisation manquant ou invalide.';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const newPassword = this.form.value.newPassword ?? '';

    this.authService.resetPassword(this.token, newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Mot de passe réinitialisé avec succès.';
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message ?? 'Impossible de réinitialiser le mot de passe.';
      }
    });
  }
}