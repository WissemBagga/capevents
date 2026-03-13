import { Component, inject } from '@angular/core';
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
        this.successMessage = res.message ?? 'Vérifiez votre boîte mail.';

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
        this.errorMessage = err?.error?.message ?? 'Impossible de lancer la réinitialisation.';
      }
    });
  }
}