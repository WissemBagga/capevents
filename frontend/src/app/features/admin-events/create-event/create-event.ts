import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { Department } from '../../../core/models/department.model';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-event.html',
  styleUrl: './create-event.css'
})
export class CreateEvent {
  private fb = inject(FormBuilder);
  private eventService = inject(EventService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  

  departments: Department[] = [];
  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  currentUser = this.authService.getCurrentUserSnapshot();

  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;



  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
    category: ['', [Validators.required]],
    description: ['', [Validators.required]],
    startAt: ['', [Validators.required]],
    durationMinutes: [60, [Validators.required, Validators.min(1)]],
    locationType: ['ONSITE', [Validators.required]],
    locationName: [''],
    meetingUrl: [''],
    address: [''],
    capacity: [10, [Validators.required, Validators.min(1), Validators.max(500)]],
    registrationDeadline: ['', [Validators.required]],
    imageUrl: [''],
    audience: ['DEPARTMENT', [Validators.required]],
    targetDepartmentId: [null as number | null]
  });

  ngOnInit(): void {
    this.loadDepartments();
    this.applyRoleRules();
  }

  get isHr(): boolean {
    return this.authService.hasRole('ROLE_HR');
  }

  get isManager(): boolean {
    return this.authService.hasRole('ROLE_MANAGER');
  }

  get currentDepartmentName(): string{
    return this.currentUser?.departmentName || 'non défini'
  }

  get currentDepartmentId(): number | null {
    return this.currentUser?.departmentId || null;
  }

  private loadDepartments(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.userService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Impossible de charger les départements.';
        this.cdr.markForCheck();
      }
    });
  }

  private applyRoleRules(): void {
    if (this.isManager) {
      this.form.patchValue({
        audience: 'DEPARTMENT',
        targetDepartmentId: this.currentDepartmentId
      });

      this.form.get('audience')?.disable();
      this.form.get('targetDepartmentId')?.disable();
    }
  }

  onLocationTypeChange(): void {
    const locationType = this.form.get('locationType')?.value;

    if (locationType === 'ONSITE') {
      this.form.patchValue({
        meetingUrl: '',
        address: ''
      });
    }

    if (locationType === 'ONLINE') {
      this.form.patchValue({
        locationName: '',
        address: ''
      });
    }

    if (locationType === 'EXTERNAL') {
      this.form.patchValue({
        locationName: '',
        meetingUrl: ''
      });
    }

    this.cdr.markForCheck();
  }

  onAudienceChange(): void {
    const audience = this.form.get('audience')?.value;

    if (audience === 'GLOBAL') {
      this.form.patchValue({
        targetDepartmentId: null
      });
    }
  }

  private toIsoInstant(value: string): string {
    return new Date(value).toISOString();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    const formValue = this.form.getRawValue();

    const payload = {
      title: formValue.title ?? '',
      category: formValue.category ?? '',
      description: formValue.description ?? '',
      startAt: this.toIsoInstant(formValue.startAt ?? ''),
      durationMinutes: Number(formValue.durationMinutes ?? 0),
      locationType: formValue.locationType as 'ONSITE' | 'ONLINE' | 'EXTERNAL',
      locationName: formValue.locationName || null,
      meetingUrl: formValue.meetingUrl || null,
      address: formValue.address || null,
      capacity: Number(formValue.capacity ?? 0),
      registrationDeadline: this.toIsoInstant(formValue.registrationDeadline ?? ''),
      imageUrl: null,
      audience: (formValue.audience ?? 'DEPARTMENT') as 'GLOBAL' | 'DEPARTMENT',
      targetDepartmentId: formValue.audience === 'GLOBAL' ? null : formValue.targetDepartmentId
    };

    this.eventService.createEvent(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = 'Événement créé avec succès.';
        this.cdr.markForCheck();

        setTimeout(() => {
          if (this.isHr) {
            this.router.navigate(['/admin/hr']);
          } else {
            this.router.navigate(['/admin/manager']);
          }
        }, 1000);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage =
          err?.error?.message ||
          err?.error ||
          'Impossible de créer l’événement.';
        this.cdr.markForCheck();
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedImageFile = file;

    if (!file) {
      this.imagePreviewUrl = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreviewUrl = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }  
}