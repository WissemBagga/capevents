import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { Department } from '../../../core/models/department.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  private fb= inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private userService = inject(UserService);

  departments: Department[] = [];

  errorMessage = '';
  successMessage = '';
  loading = false;

  registerForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(190)]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
    phone: [''],
    departmentId: [null as number | null]
  });

  onSubmit(): void{
    if(this.registerForm.invalid){
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage='';

    const payload = {
      firstName: this.registerForm.value.firstName ?? '',
      lastName: this.registerForm.value.lastName ?? '',
      email: this.registerForm.value.email ?? '',
      password: this.registerForm.value.password ?? '',
      phone: this.registerForm.value.phone ?? '',
      departmentId: this.registerForm.value.departmentId ?? null
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Compte créé. Vérifiez votre email.';
        setTimeout(() => {
          this.router.navigate(['/verify-email-pending'], {
            queryParams: { email: payload.email }
          });
        }, 800);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage= err?.error.message ?? 'Impossible de créer le compte.'
      }
    });
  }

  ngOnInit(): void {
    this.userService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les départements.';
      }
    });
  }



}
