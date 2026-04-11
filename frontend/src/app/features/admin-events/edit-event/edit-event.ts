import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { EventService } from '../../../core/services/event.service';
import { UserService } from '../../../core/services/user.service';
import { Department } from '../../../core/models/department.model';
import { AuthService } from '../../../core/services/auth.service';
import { EVENT_CATEGORY_OPTIONS } from '../../../core/constants/event-categories';

@Component({
  selector: 'app-edit-event',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-event.html',
  styleUrl: './edit-event.css'
})
export class EditEvent {
  private fb = inject(FormBuilder);
  private eventService = inject(EventService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  readonly categoryOptions = EVENT_CATEGORY_OPTIONS;
  originalRegisteredCount = 0;


  departments: Department[] = [];
  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  eventId = '';

  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  currentUser = this.authService.getCurrentUserSnapshot();

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
    category: ['', [Validators.required]],
    description: ['', [Validators.required]],
    startAt: ['', [Validators.required]],
    durationMinutes: [30, [Validators.required, Validators.min(30)]],
    locationType: ['ONSITE', [Validators.required]],
    locationName: [''],
    meetingUrl: [''],
    address: [''],
    capacity: [2, [Validators.required, Validators.min(2)]],
    registrationDeadline: ['', [Validators.required]],
    imageUrl: [''],
    audience: ['DEPARTMENT', [Validators.required]],
    targetDepartmentId: [null as number | null]
  });

  get isHr(): boolean {
    return this.authService.hasRole('ROLE_HR');
  }

  get isManager(): boolean {
    return this.authService.hasRole('ROLE_MANAGER');
  }

  get currentDepartmentName(): string {
    return this.currentUser?.departmentName || 'non défini';
  }

  get currentDepartmentId(): number | null {
    return this.currentUser?.departmentId || null;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage = 'Identifiant de l’événement manquant.';
      this.cdr.markForCheck();
      return;
    }

    this.eventId = id;
    this.loadDepartments();
    this.loadEvent();
    this.onLocationTypeChange();
    this.onAudienceChange();
  }

  private loadDepartments(): void {
    this.userService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les départements.';
        this.cdr.markForCheck();
      }
    });
  }

  private loadEvent(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getAdminById(this.eventId).subscribe({
      next: (event) => {
        this.form.patchValue({
          title: event.title,
          category: event.category ?? '',
          description: event.description ?? '',
          startAt: this.toDatetimeLocal(event.startAt),
          durationMinutes: event.durationMinutes,
          locationType: event.locationType,
          locationName: event.locationName || '',
          meetingUrl: event.meetingUrl || '',
          address: event.address || '',
          capacity: event.capacity,
          registrationDeadline: this.toDatetimeLocal(event.registrationDeadline),
          imageUrl: event.imageUrl || '',
          audience: event.audience,
          targetDepartmentId: event.targetDepartmentId
        });

        this.originalRegisteredCount = event.registeredCount ?? 0;
        this.imagePreviewUrl = event.imageUrl || null;

        if (this.isManager) {
          this.form.patchValue({
            audience: 'DEPARTMENT',
            targetDepartmentId: this.currentDepartmentId
          });

          this.form.get('audience')?.disable();
          this.form.get('targetDepartmentId')?.disable();
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message ||
          err?.error ||
          'Impossible de charger l’événement.';
        this.cdr.markForCheck();
      }
    });
  }

  onLocationTypeChange(): void {
    const locationType = this.form.get('locationType')?.value;

    this.form.get('locationName')?.clearValidators();
    this.form.get('meetingUrl')?.clearValidators();
    this.form.get('address')?.clearValidators();

    if (locationType === 'ONSITE') {
      this.form.patchValue({
        meetingUrl: '',
        address: ''
      });
      this.form.get('locationName')?.setValidators([Validators.required]);
    }

    if (locationType === 'ONLINE') {
      this.form.patchValue({
        locationName: '',
        address: ''
      });
      this.form.get('meetingUrl')?.setValidators([Validators.required]);
    }

    if (locationType === 'EXTERNAL') {
      this.form.patchValue({
        locationName: '',
        meetingUrl: ''
      });
      this.form.get('address')?.setValidators([Validators.required]);
    }

    this.form.get('locationName')?.updateValueAndValidity();
    this.form.get('meetingUrl')?.updateValueAndValidity();
    this.form.get('address')?.updateValueAndValidity();

    this.cdr.markForCheck();
  }

  onAudienceChange(): void {
    const audience = this.form.getRawValue().audience;

    if (audience === 'GLOBAL') {
      this.form.patchValue({ targetDepartmentId: null });
      this.form.get('targetDepartmentId')?.clearValidators();
    } else {
      if (this.isHr) {
        this.form.get('targetDepartmentId')?.setValidators([Validators.required]);
      }
    }

    this.form.get('targetDepartmentId')?.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedImageFile = file;

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreviewUrl = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  private toIsoInstant(value: string): string {
    return new Date(value).toISOString();
  }

  private toDatetimeLocal(value: string): string {
    const date = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
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

    if (this.capacityBelowRegistrations) {
      this.errorMessage = `Impossible de réduire la capacité en dessous de ${this.originalRegisteredCount} inscrit(s).`;
      this.cdr.markForCheck();
      return;
    }

    this.eventService.updateEvent(this.eventId, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = 'Événement modifié avec succès.';
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
          'Impossible de modifier l’événement.';
        this.cdr.markForCheck();
      }
    });
  }

  get hasRegisteredParticipants(): boolean {
    return this.originalRegisteredCount > 0;
  }

  get capacityBelowRegistrations(): boolean {
    const capacity = Number(this.form.get('capacity')?.value ?? 0);
    return capacity < this.originalRegisteredCount;
  }

}