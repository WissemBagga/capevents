import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChangeDetectorRef, Component, inject } from '@angular/core';


import { AuthService } from '../../../core/services/auth.service';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ScrollToMessageDirective],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef)

  private route = inject(ActivatedRoute)

  loading = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    newPassword: ['',[
    Validators.required,
    Validators.minLength(8),
    Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
  ]]
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
        this.successMessage = 'Mot de passe modifié avec succès. Redirection vers la connexion...';
        this.cdr.markForCheck();

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.mapResetPasswordError(err);
        this.cdr.markForCheck();
      }
    });
  }

  private mapResetPasswordError(err: any): string {
    const raw = err?.error?.message || err?.error || '';

    if (typeof raw !== 'string') {
      return 'Impossible de réinitialiser le mot de passe.';
    }

    if (raw.includes('Invalid token')) {
      return 'Le token de réinitialisation est invalide.';
    }

    if (raw.includes('Token expired')) {
      return 'Le token de réinitialisation a expiré.';
    }

    return raw || 'Impossible de réinitialiser le mot de passe.';
  }


}