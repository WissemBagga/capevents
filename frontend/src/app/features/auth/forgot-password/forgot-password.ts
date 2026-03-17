import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef)




  loading = false;
  errorMessage = '';
  successMessage = '';
  resetToken = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.resetToken = '';

    const email = this.form.value.email ?? '';

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = 'Si cet email existe, un lien de réinitialisation a été envoyé.';
        this.cdr.markForCheck();

        if (res.resetToken) {
          setTimeout(() => {
            this.router.navigate(['/reset-password'], {
              queryParams: { token: res.resetToken }
            });
          }, 1000);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.mapForgotPasswordError(err);
        this.cdr.markForCheck();
      }
    });
  }

  private mapForgotPasswordError(err: any): string {
    const raw = err?.error?.message || err?.error || '';

    if (typeof raw !== 'string') {
      return 'Impossible d’envoyer la demande de réinitialisation.';
    }

    if (raw.includes('Email not found')) {
      return 'Aucun compte n’est associé à cet email.';
    }

    return raw || 'Impossible d’envoyer la demande de réinitialisation.';
  }
}