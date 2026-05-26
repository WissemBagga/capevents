import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

import { ChangeDetectorRef, Component, inject } from '@angular/core';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';


@Component({
  selector: 'app-verify-email-pending',
  standalone: true,
  imports: [RouterLink, ScrollToMessageDirective],
  templateUrl: './verify-email-pending.html',
  styleUrl: './verify-email-pending.css'
})
export class VerifyEmailPending {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef)

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
        this.successMessage = 'Un nouvel email de vÃ©rification a Ã©tÃ© envoyÃ©.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;

        const raw = err?.error?.message || err?.error || '';
        this.errorMessage = typeof raw === 'string' ? raw : 'Impossible de renvoyer lâ€™email de vÃ©rification.';
        this.cdr.markForCheck();
      }
    });
  }
}

