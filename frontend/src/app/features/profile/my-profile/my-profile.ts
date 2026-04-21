import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ProfileService } from '../../../core/services/profile.service';

import { AVATAR_PRESETS } from '../../../core/constants/avatar-presets';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [ReactiveFormsModule, ScrollToMessageDirective],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.css'
})
export class MyProfile {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private cdr = inject(ChangeDetectorRef);


  readonly avatarPresets = AVATAR_PRESETS;

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  profile: any = null;


  avatarMode: 'PRESET' | 'CUSTOM_URL' = 'PRESET';
  selectedAvatarPresetUrl = this.avatarPresets[0].url;

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    jobTitle: ['', [Validators.maxLength(120)]],
    avatarUrl: ['', [Validators.maxLength(500)]]
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = '';
    this.profileService.getMyProfile()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (profile) => {
          this.profile = profile;

          const avatarUrl = profile.avatarUrl ?? this.avatarPresets[0].url;
          const presetMatch = this.avatarPresets.find(item => item.url === avatarUrl);

          this.avatarMode = presetMatch ? 'PRESET' : 'CUSTOM_URL';
          this.selectedAvatarPresetUrl = presetMatch?.url ?? this.avatarPresets[0].url;

          this.form.patchValue({
            firstName: profile.firstName,
            lastName: profile.lastName,
            jobTitle: profile.jobTitle ?? '',
            avatarUrl
          });

          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Impossible de charger le profil.';
          this.cdr.markForCheck();
        }
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const v = this.form.getRawValue();
    const rawAvatar = v.avatarUrl?.trim() || '';

    if (this.avatarMode === 'CUSTOM_URL' && rawAvatar && !this.isHttpUrl(rawAvatar)) {
      this.saving = false;
      this.errorMessage = 'Veuillez saisir une URL valide commençant par http:// ou https://';
      this.cdr.markForCheck();
      return;
    }

    this.profileService.updateMyProfile({
      firstName: v.firstName ?? '',
      lastName: v.lastName ?? '',
      jobTitle: v.jobTitle?.trim() ? v.jobTitle.trim() : null,
      avatarUrl: rawAvatar ? rawAvatar : null
    })
    .pipe(finalize(() => {
      this.saving = false;
      this.cdr.markForCheck();
    }))
    .subscribe({
      next: (profile) => {
        this.profile = profile;
        this.successMessage = 'Profil mis à jour avec succès.';
        this.cdr.markForCheck();

        setTimeout(() => {
          window.location.reload();
        }, 600);
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          err?.error ||
          'Impossible de mettre à jour le profil.';
        this.cdr.markForCheck();
      }
    });
  }

  selectAvatarPreset(url: string): void {
    this.avatarMode = 'PRESET';
    this.selectedAvatarPresetUrl = url;
    this.form.patchValue({ avatarUrl: url });
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

  onAvatarModeChange(mode: 'PRESET' | 'CUSTOM_URL'): void {
    this.avatarMode = mode;

    if (mode === 'PRESET') {
      this.form.patchValue({ avatarUrl: this.selectedAvatarPresetUrl });
    } else {
      this.form.patchValue({ avatarUrl: '' });
    }

    this.cdr.markForCheck();
  }

  get avatarPreviewUrl(): string {
    const value = this.form.get('avatarUrl')?.value?.trim();
    if (this.avatarMode === 'CUSTOM_URL' && value) {
      return value;
    }

    return this.selectedAvatarPresetUrl;
  }
}