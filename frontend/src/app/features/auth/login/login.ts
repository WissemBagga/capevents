import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';




@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ScrollToMessageDirective],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService)
  private router = inject(Router)
  private cdr = inject(ChangeDetectorRef)

  errorMessage='';
  loading=false;

  
  loginForm = this.fb.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[A-Za-z0-9._%+-]+@capgemini\.com$/i)
      ]
    ],
    password: ['', [Validators.required]]
  });




  onSubmit():void{
    if(this.loginForm.invalid){
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage='';

    const payload = {
      email: this.loginForm.value.email!,
      password: this.loginForm.value.password!
    };



    this.authService.login(payload).subscribe({
      next: () => {
        this.authService.getMe().subscribe({
          next: () => {
            const role = this.authService.getPrimaryRole()
            if (role === 'ROLE_HR') {
              this.router.navigate(['/admin/hr']);
            } else if (role === 'ROLE_MANAGER') {
              this.router.navigate(['/admin/manager']);
            } else {
              this.router.navigate(['/dashboard/employee']);
            }
          },
          error: (err) => {
            this.loading = false;
            this.errorMessage = this.mapLoginError(err);
            this.cdr.markForCheck();
          },
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.mapLoginError(err);
        this.cdr.markForCheck();
      }
    })
  }


  private mapLoginError(err: any): string {
    const raw = err?.error?.message || err?.error || '';

    if (typeof raw !== 'string') {
      return 'Connexion impossible.';
    }

    if (raw.includes('Email is not verified')) {
      return 'Votre email n’est pas encore vérifié.';
    }

    if (raw.includes('Bad credentials') || raw.includes('Invalid email or password')) {
      return 'Email ou mot de passe incorrect.';
    }

    if (raw.includes('User is not active')) {
      return 'Votre compte est désactivé. Contactez un administrateur.';
    }

    return raw || 'Connexion impossible.';
  }
}
