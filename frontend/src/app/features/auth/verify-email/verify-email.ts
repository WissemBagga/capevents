import { AuthService } from '@core/services/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChangeDetectorRef, Component, inject } from '@angular/core';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';


@Component({
  selector: 'app-verify-email',
  imports: [RouterLink, ScrollToMessageDirective],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef)

  loading = true;
  successMessage = '';
  errorMessage = '';
  alreadyVerified = false;


  

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!token) {
      this.loading = false;
      this.errorMessage = 'Token de vÃ©rification manquant.';
      return;
    }

    
    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Votre email a Ã©tÃ© vÃ©rifiÃ© avec succÃ¨s. Redirection vers la connexion...';
        this.cdr.markForCheck();

        setTimeout(() => {
          this.router.navigate(['/login'], { queryParams: { verified: 'true' } });
        }, 2000);
      },
      error: (err) => {
        this.loading = false;

        const raw = err?.error?.message || err?.error || '';

        if (!token) {
          this.errorMessage = 'Le token de vÃ©rification est manquant.';
        } else if (typeof raw === 'string' && raw.includes('Invalid verification token')) {
          this.errorMessage = 'Le lien de vÃ©rification est invalide.';
        } else if (typeof raw === 'string' && raw.includes('already used')) {
          this.errorMessage = 'Ce lien de vÃ©rification a dÃ©jÃ  Ã©tÃ© utilisÃ©. Vous pouvez vous connecter.';
        } else {
          this.errorMessage = raw || 'La vÃ©rification de lâ€™email a Ã©chouÃ©.';
        }

        this.cdr.markForCheck();
      }
    });
  }
}

