import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { EventService } from '@core/services/event.service';
import { UserService } from '@core/services/user.service';
import { AuthService } from '@core/services/auth.service';
import { Department } from '@core/models/department.model';

import { EVENT_CATEGORY_OPTIONS } from '@core/constants/event-categories';

import { EVENT_IMAGE_PRESETS, getDefaultEventImage } from '@core/constants/event-image-presets';

import { ScrollToMessageDirective } from '../../../../shared/directives/scroll-to-message.directive';

import { AiPlanningService } from '@core/services/ai-planning.service';



@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ScrollToMessageDirective],
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
  private route = inject(ActivatedRoute);

  private aiPlanningService = inject(AiPlanningService);
  private aiPlanningUsageToLog: any | null = null;

  readonly categoryOptions = EVENT_CATEGORY_OPTIONS;
  readonly eventImagePresets = EVENT_IMAGE_PRESETS;


  departments: Department[] = [];
  loading = false;
  savingDraft = false;
  publishing = false;  errorMessage = '';
  successMessage = '';
  currentUser = this.authService.getCurrentUserSnapshot();

  imagePreviewUrl: string | null = null;

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

  ngOnInit(): void {
    this.loadDepartments();
    this.applyRoleRules();
    this.onLocationTypeChange();
    this.onAudienceChange();
    this.syncEventImageSelection();
    this.applyAiPlanningProposalIfPresent();
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

  private toIsoInstant(value: string): string {
    return new Date(value).toISOString();
  }

  get adminDashboardRoute(): string {
    return this.isHr ? '/admin/hr' : '/admin/manager';
  }

  saveAsDraft(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.savingDraft = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    const rawImage = this.form.get('imageUrl')?.value?.trim() || '';

    if (this.imageMode === 'CUSTOM_URL' && rawImage && !this.isHttpUrl(rawImage)) {
      this.savingDraft = false;
      this.errorMessage = 'Veuillez saisir une URL image valide commençant par http:// ou https://';
      this.cdr.markForCheck();
      return;
    }

    const payload = this.buildPayload();

    this.eventService.createEvent(payload).subscribe({
      next: (createdEvent) => {
        this.logCreatedFromAiProposal(createdEvent?.id ?? null, 'DRAFT');

        this.savingDraft = false;
        this.successMessage = 'Événement enregistré en brouillon.';
        this.cdr.markForCheck();

        setTimeout(() => {
          this.router.navigate([this.adminDashboardRoute]);
        }, 1000);
      },
      error: (err) => {
        this.savingDraft = false;
        this.errorMessage =
          err?.error?.message ||
          err?.error ||
          'Impossible d’enregistrer l’événement en brouillon.';
        this.cdr.markForCheck();
      }
    });
  }

  createAndPublish(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.publishing = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    const rawImage = this.form.get('imageUrl')?.value?.trim() || '';

    if (this.imageMode === 'CUSTOM_URL' && rawImage && !this.isHttpUrl(rawImage)) {
      this.publishing = false;
      this.errorMessage = 'Veuillez saisir une URL image valide commençant par http:// ou https://';
      this.cdr.markForCheck();
      return;
    }

    const payload = this.buildPayload();

    this.eventService.createEvent(payload).subscribe({
      next: (createdEvent) => {
        this.eventService.publishEvent(createdEvent.id)
          .subscribe({
            next: () => {
              this.logCreatedFromAiProposal(createdEvent?.id ?? null, 'PUBLISHED');

              this.publishing = false;
              this.successMessage = 'Événement créé et publié avec succès.';
              this.cdr.markForCheck();

              setTimeout(() => {
                this.router.navigate([this.adminDashboardRoute]);
              }, 1000);
            },
            error: (err) => {
              this.publishing = false;
              this.errorMessage =
                err?.error?.message ||
                err?.error ||
                'Événement créé, mais impossible de le publier.';
              this.cdr.markForCheck();
            }
          });
      },
      error: (err) => {
        this.publishing = false;
        this.errorMessage =
          err?.error?.message ||
          err?.error ||
          'Impossible de créer puis publier l’événement.';
        this.cdr.markForCheck();
      }
    });
  }


  private buildPayload() {
    const formValue = this.form.getRawValue();

    return {
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
      imageUrl: this.form.get('imageUrl')?.value?.trim() || this.defaultCategoryImageUrl,
      audience: (formValue.audience ?? 'DEPARTMENT') as 'GLOBAL' | 'DEPARTMENT',
      targetDepartmentId: formValue.audience === 'GLOBAL' ? null : formValue.targetDepartmentId
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

    this.imagePreviewUrl = this.previewEventImageUrl;
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

  private applyAiPlanningProposalIfPresent(): void {
    const proposalKey = this.route.snapshot.queryParamMap.get('aiProposal');
    const trackingKey = this.route.snapshot.queryParamMap.get('aiTracking');

    if (!proposalKey) return;

    const rawProposal = sessionStorage.getItem(proposalKey);

    if (!rawProposal) return;

    try {
      const proposal = JSON.parse(rawProposal);

      if (trackingKey) {
        const rawTracking = sessionStorage.getItem(trackingKey);

        if (rawTracking) {
          this.aiPlanningUsageToLog = JSON.parse(rawTracking);
          sessionStorage.removeItem(trackingKey);
        }
      }

      if (!this.aiPlanningUsageToLog && proposal.aiPlanningUsage) {
        this.aiPlanningUsageToLog = proposal.aiPlanningUsage;
      }

      const startAtLocal = this.toDateTimeLocalValue(proposal.startAt);
      const deadlineLocal = this.buildDefaultRegistrationDeadline(proposal.startAt);

      this.form.patchValue({
        title: proposal.title ?? '',
        category: proposal.category ?? '',
        description: proposal.description ?? '',
        startAt: startAtLocal,
        durationMinutes: proposal.durationMinutes ?? 60,
        locationType: proposal.locationType ?? 'ONSITE',
        capacity: proposal.capacity ?? 30,
        registrationDeadline: deadlineLocal,
        audience: this.isManager ? 'DEPARTMENT' : proposal.audience ?? 'DEPARTMENT',
        targetDepartmentId: this.isManager
          ? this.currentDepartmentId
          : proposal.targetDepartmentId ?? null
      });

      this.onLocationTypeChange();
      this.onAudienceChange();

      this.imageMode = 'AUTO';
      this.syncEventImageSelection();

      sessionStorage.removeItem(proposalKey);

      this.successMessage = 'Proposition IA appliquée au formulaire. Vérifiez les informations avant validation.';
      this.cdr.markForCheck();
    } catch {
      this.errorMessage = 'Impossible de charger la proposition IA.';
      this.cdr.markForCheck();
    }
  }

  private toDateTimeLocalValue(value: string): string {
    if (!value) return '';

    const date = new Date(value);
    const offsetMs = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offsetMs);

    return localDate.toISOString().slice(0, 16);
  }

  private buildDefaultRegistrationDeadline(startAt: string): string {
    if (!startAt) return '';

    const date = new Date(startAt);
    date.setDate(date.getDate() - 1);

    return this.toDateTimeLocalValue(date.toISOString());
  }

  private logCreatedFromAiProposal(
    createdEventId: string | null | undefined,
    createdEventStatus: 'DRAFT' | 'PUBLISHED'
  ): void {
    if (!this.aiPlanningUsageToLog) {
      return;
    }

    this.aiPlanningService.logUsage({
      requestId: this.aiPlanningUsageToLog.requestId ?? undefined,
      action: 'EVENT_CREATED_FROM_AI_PROPOSAL',
      proposalRank: this.aiPlanningUsageToLog.proposalRank ?? null,
      proposalTitle: this.aiPlanningUsageToLog.proposalTitle ?? null,
      category: this.aiPlanningUsageToLog.category ?? null,
      targetDepartmentId: this.aiPlanningUsageToLog.targetDepartmentId ?? null,
      selectedSlotStartAt: this.aiPlanningUsageToLog.selectedSlotStartAt ?? null,
      selectedSlotScore: this.aiPlanningUsageToLog.selectedSlotScore ?? null,
      createdEventId: createdEventId ?? null,
      createdEventStatus,
      source: 'angular_create_event'
    }).subscribe({
      next: () => {
        this.aiPlanningUsageToLog = null;
      },
      error: () => {
        // Monitoring non bloquant.
      }
    });
  }

}
