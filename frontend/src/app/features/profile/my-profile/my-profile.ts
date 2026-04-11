import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ProfileService } from '../../../core/services/profile.service';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.css'
})
export class MyProfile {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  profile: any = null;

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
          this.form.patchValue({
            firstName: profile.firstName,
            lastName: profile.lastName,
            jobTitle: profile.jobTitle ?? '',
            avatarUrl: profile.avatarUrl ?? ''
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

    this.profileService.updateMyProfile({
      firstName: v.firstName ?? '',
      lastName: v.lastName ?? '',
      jobTitle: v.jobTitle?.trim() ? v.jobTitle.trim() : null,
      avatarUrl: v.avatarUrl?.trim() ? v.avatarUrl.trim() : null
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
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || err?.error || 'Impossible de mettre à jour le profil.';
        this.cdr.markForCheck();
      }
    });
  }
}