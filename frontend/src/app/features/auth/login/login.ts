import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService)
  private router = inject(Router)

  errorMessage='';
  loading=false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['',[Validators.required]]
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
          next: (user) => {
            if (user.roles.includes('ROLE_HR')) {
                this.router.navigate(['/admin/hr']);
            } else if (user.roles.includes('ROLES_MANAGER')){
                this.router.navigate(['/admin/manager']);
            }else{
                this.router.navigate(['/dashboard/employee']);
            }
          },
          error: () => {
            this.loading = false;
            this.errorMessage = 'Impossible de récupérer le profil utilisateur.';  
          },
        });
      },
      error: () => {
        this.loading = false;
        this.errorMessage='Adresse e-mail ou mot de passe invalide.';
      }
    })
  }
}
