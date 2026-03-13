import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email-pending',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verify-email-pending.html',
  styleUrl: './verify-email-pending.css'
})
export class VerifyEmailPending {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  email = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
  }

  resendVerification(): void {
    if (!this.email) {
      this.errorMessage = 'Email manquant.';
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.authService.resendVerification(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Email de vérification renvoyé.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message ?? 'Impossible de renvoyer l’email de vérification.';
      }
    });
  }
}
