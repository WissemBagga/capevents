import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

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

    this.authService.verifyEmail(token)
    .pipe(finalize(()=> {
      this.loading = false;
    }))   
    .subscribe({
      next: () => {
        this.successMessage = 'Votre email a été vérifié avec succès.';
        setTimeout(()=> this.router.navigate(['/login']),1500);
      },
      error: (err) => {
        const backendMessage = err?.error?.message || err?.error || '';

        if (typeof backendMessage === 'string' && backendMessage.includes('already used')) {
          this.successMessage = 'Cet email a déjà été vérifié. Vous pouvez vous connecter.';
          setTimeout(() => this.router.navigate(['/login']), 1500);
          return;
        }  

        this.errorMessage = backendMessage || 'La vérification de l’email a échoué.';
      }
    });
  }
}
