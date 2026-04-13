import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/services/auth.service';
import { CreateEventRequest } from '../../../core/models/create-event.model';

import { EVENT_CATEGORY_OPTIONS } from '../../../core/constants/event-categories';

@Component({
  selector: 'app-submit-event',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './submit-event.html',
  styleUrl: './submit-event.css'
})
export class SubmitEvent {
  private fb = inject(FormBuilder);
  private eventService = inject(EventService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  readonly categoryOptions = EVENT_CATEGORY_OPTIONS;

  loading = false;
  errorMessage = '';
  successMessage = '';

  currentUser = this.authService.getCurrentUserSnapshot();

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
    category: ['', [Validators.required]],
    description: [''],
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

  get currentDepartmentId(): number | null {
    return this.currentUser?.departmentId || null;
  }

  get canShareDirectly(): boolean {
    const duration = Number(this.form.get('durationMinutes')?.value ?? 0);
    const capacity = Number(this.form.get('capacity')?.value ?? 0);
    return duration <= 35 && capacity <= 5;
  }

  get submitLabel(): string {
    return this.canShareDirectly ? 'Partager directement' : 'Proposer à un admin';
  }

  get helperMessage(): string {
    return this.canShareDirectly
      ? 'Micro-événement détecté : partage direct autorisé.'
      : 'Validation admin obligatoire : la demande sera envoyée aux administrateurs concernés.';
  }

  ngOnInit(): void {
    this.form.patchValue({
      audience: 'DEPARTMENT',
      targetDepartmentId: this.currentDepartmentId
    });

    this.onLocationTypeChange();
    this.onAudienceChange();
  }

  onLocationTypeChange(): void {
    const locationType = this.form.get('locationType')?.value;

    this.form.get('locationName')?.clearValidators();
    this.form.get('meetingUrl')?.clearValidators();
    this.form.get('address')?.clearValidators();

    if (locationType === 'ONSITE') {
      this.form.patchValue({ meetingUrl: '', address: '' });
      this.form.get('locationName')?.setValidators([Validators.required]);
    }

    if (locationType === 'ONLINE') {
      this.form.patchValue({ locationName: '', address: '' });
      this.form.get('meetingUrl')?.setValidators([Validators.required]);
    }

    if (locationType === 'EXTERNAL') {
      this.form.patchValue({ locationName: '', meetingUrl: '' });
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
      this.form.patchValue({ targetDepartmentId: this.currentDepartmentId });
    }

    this.form.get('targetDepartmentId')?.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    const payload = this.buildPayload();

    this.eventService.submitEventByEmployee(payload)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.successMessage = response.message;

          if (response.directlyPublished) {
            this.router.navigate(['/events', response.eventId]);
            return;
          }

          this.form.reset({
            title: '',
            category: '',
            description: '',
            startAt: '',
            durationMinutes: 30,
            locationType: 'ONSITE',
            locationName: '',
            meetingUrl: '',
            address: '',
            capacity: 2,
            registrationDeadline: '',
            imageUrl: '',
            audience: 'DEPARTMENT',
            targetDepartmentId: this.currentDepartmentId
          });

          this.onLocationTypeChange();
          this.onAudienceChange();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de soumettre cet événement.';
          this.cdr.markForCheck();
        }
      });
  }

  private buildPayload(): CreateEventRequest {
    const formValue = this.form.getRawValue();

    return {
      title: formValue.title ?? '',
      category: formValue.category ?? '',
      description: formValue.description ?? '',
      startAt: new Date(formValue.startAt ?? '').toISOString(),
      durationMinutes: Number(formValue.durationMinutes ?? 0),
      locationType: formValue.locationType as 'ONSITE' | 'ONLINE' | 'EXTERNAL',
      locationName: formValue.locationName || null,
      meetingUrl: formValue.meetingUrl || null,
      address: formValue.address || null,
      capacity: Number(formValue.capacity ?? 0),
      registrationDeadline: new Date(formValue.registrationDeadline ?? '').toISOString(),
      imageUrl: null,
      audience: (formValue.audience ?? 'DEPARTMENT') as 'GLOBAL' | 'DEPARTMENT',
      targetDepartmentId: formValue.audience === 'GLOBAL' ? null : this.currentDepartmentId
    };
  }
}
