import { AuthService } from '../../../core/services/auth.service';
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
      this.errorMessage = 'Token de vérification manquant.';
      return;
    }

    
    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Votre email a été vérifié avec succès. Redirection vers la connexion...';
        this.cdr.markForCheck();

        setTimeout(() => {
          this.router.navigate(['/login'], { queryParams: { verified: 'true' } });
        }, 2000);
      },
      error: (err) => {
        this.loading = false;

        const raw = err?.error?.message || err?.error || '';

        if (!token) {
          this.errorMessage = 'Le token de vérification est manquant.';
        } else if (typeof raw === 'string' && raw.includes('Invalid verification token')) {
          this.errorMessage = 'Le lien de vérification est invalide.';
        } else if (typeof raw === 'string' && raw.includes('already used')) {
          this.errorMessage = 'Ce lien de vérification a déjà été utilisé. Vous pouvez vous connecter.';
        } else {
          this.errorMessage = raw || 'La vérification de l’email a échoué.';
        }

        this.cdr.markForCheck();
      }
    });
  }
}
