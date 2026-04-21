import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/services/auth.service';
import { CreateEventRequest } from '../../../core/models/create-event.model';

import { EVENT_CATEGORY_OPTIONS } from '../../../core/constants/event-categories';

import { EVENT_IMAGE_PRESETS, getDefaultEventImage } from '../../../core/constants/event-image-presets';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';


@Component({
  selector: 'app-submit-event',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ScrollToMessageDirective],
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
  readonly eventImagePresets = EVENT_IMAGE_PRESETS;


  loading = false;
  errorMessage = '';
  successMessage = '';

  currentUser = this.authService.getCurrentUserSnapshot();


  imageMode: 'AUTO' | 'PRESET' | 'CUSTOM_URL' = 'AUTO';
  selectedPresetImageUrl = '';

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
    this.syncEventImageSelection();
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

    const rawImage = this.form.get('imageUrl')?.value?.trim() || '';

    if (this.imageMode === 'CUSTOM_URL' && rawImage && !this.isHttpUrl(rawImage)) {
      this.errorMessage = 'Veuillez saisir une URL image valide commençant par http:// ou https://';
      this.cdr.markForCheck();
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

          this.imageMode = 'AUTO';
          this.selectedPresetImageUrl = '';
          this.onLocationTypeChange();
          this.onAudienceChange();
          this.syncEventImageSelection();
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
      imageUrl: this.form.get('imageUrl')?.value?.trim() || this.defaultCategoryImageUrl,
      audience: (formValue.audience ?? 'DEPARTMENT') as 'GLOBAL' | 'DEPARTMENT',
      targetDepartmentId: formValue.audience === 'GLOBAL' ? null : this.currentDepartmentId
    };
  }

  onCategoryChange(): void {
    if (this.imageMode === 'AUTO') {
      this.syncEventImageSelection();
    }
  }

  onImageModeChange(mode: 'AUTO' | 'PRESET' | 'CUSTOM_URL'): void {
    this.imageMode = mode;
    this.syncEventImageSelection();
  }

  selectEventPreset(url: string): void {
    this.imageMode = 'PRESET';
    this.selectedPresetImageUrl = url;
    this.form.patchValue({ imageUrl: url });
    this.cdr.markForCheck();
  }

  get defaultCategoryImageUrl(): string {
    const category = this.form.get('category')?.value;
    return getDefaultEventImage(category);
  }

  get previewEventImageUrl(): string {
    if (this.imageMode === 'CUSTOM_URL') {
      const custom = this.form.get('imageUrl')?.value?.trim();
      return custom || this.defaultCategoryImageUrl;
    }

    if (this.imageMode === 'PRESET' && this.selectedPresetImageUrl) {
      return this.selectedPresetImageUrl;
    }

    return this.defaultCategoryImageUrl;
  }

  private syncEventImageSelection(): void {
    if (this.imageMode === 'AUTO') {
      this.form.patchValue({ imageUrl: this.defaultCategoryImageUrl });
    } else if (this.imageMode === 'PRESET') {
      this.form.patchValue({ imageUrl: this.selectedPresetImageUrl || this.defaultCategoryImageUrl });
    } else if (this.imageMode === 'CUSTOM_URL') {
      if (!this.form.get('imageUrl')?.value) {
        this.form.patchValue({ imageUrl: '' });
      }
    }

    this.cdr.markForCheck();
  }

  private isHttpUrl(value: string | null | undefined): boolean {
    if (!value?.trim()) return false;

    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
