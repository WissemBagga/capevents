import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef)

  departments: Department[] = [];

  errorMessage = '';
  successMessage = '';
  loading = false;

  registerForm = this.fb.group({
    firstName: [
        '',
        [
          Validators.required, Validators.maxLength(80),
          Validators.pattern(/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]*$/)
        ]
      ],
    lastName: [
        '',
        [
          Validators.required, Validators.maxLength(80),
          Validators.pattern(/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]*$/)
        ]
      ],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(190)]],
    password: ['', [Validators.required, Validators.minLength(8), 
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)]],
    phone: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\+216(?:\s?\d{8}|\s?\d{2}\s?\d{3}\s?\d{3})$/)
      ]
    ],
    departmentId: [null as number | null, [Validators.required]]
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
        this.errorMessage = this.mapRegisterError(err);
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    this.userService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.mapRegisterError(err);
        this.cdr.markForCheck();
      }
    });
  }


  private mapRegisterError(err: any): string {
    const raw = err?.error?.message || err?.error || '';

    if (typeof raw !== 'string') {
      return 'Impossible de créer le compte.';
    }

    if (raw.includes('Email already used')) {
      return 'Cet email est déjà utilisé.';
    }

    if (raw.includes('Email domain is not allowed')) {
      return 'Le domaine de cet email n’est pas autorisé. Utilisez une adresse @capgemini.com.';
    }

    if (raw.includes('Department not found')) {
      return 'Le département sélectionné est invalide.';
    }

    return raw || 'Impossible de créer le compte.';
  }

}
