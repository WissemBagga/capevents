import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';
import { EventFeedbackResponse } from '../../../core/models/feedback.model';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

@Component({
  selector: 'app-feedback-event',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, ScrollToMessageDirective],
  templateUrl: './feedback-event.html',
  styleUrl: './feedback-event.css'
})
export class FeedbackEvent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);

  eventId = '';
  event: EventResponse | null = null;
  existingFeedback: EventFeedbackResponse | null = null;

  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  

  form = this.fb.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.maxLength(2000)]],
    shareCommentPublicly: [false]
  });

  get currentRating(): number {
    return this.form.controls.rating.value ?? 5;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage = 'Identifiant de l’événement manquant.';
      this.cdr.markForCheck();
      return;
    }

    this.eventId = id;
    this.loadEvent();
    this.loadMyFeedback();
  }

  private loadEvent(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getPublishedById(this.eventId)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (event) => {
          this.event = event;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger l’événement.';
          this.cdr.markForCheck();
        }
      });
  }

  private loadMyFeedback(): void {
    this.eventService.getMyFeedback(this.eventId).subscribe({
      next: (feedback) => {
        this.existingFeedback = feedback;
        this.form.patchValue({
          rating: feedback.rating,
          comment: feedback.comment || ''
        });
        this.form.disable();
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err?.status === 404) {
          this.existingFeedback = null;
          this.cdr.markForCheck();
          return;
        }

        this.errorMessage =
          err?.error?.message ||
          err?.error ||
          'Impossible de vérifier votre feedback.';
        this.cdr.markForCheck();
      }
    });
  }

  submit(): void {
    if (this.form.invalid || this.existingFeedback) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = {
      rating: form.rating,
      comment: form.comment?.trim() ? form.comment.trim() : null,
      shareCommentPublicly: !!form.shareCommentPublicly
    };

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    const formValue = this.form.getRawValue();

    this.eventService.createFeedback(this.eventId, {
      rating: Number(formValue.rating ?? 0),
      comment: formValue.comment?.trim() ? formValue.comment.trim() : null
    })
      .pipe(finalize(() => {
        this.submitting = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (feedback) => {
          this.existingFeedback = feedback;
          this.successMessage = 'Merci, votre feedback a bien été envoyé.';
          this.form.disable();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible d’envoyer votre feedback.';
          this.cdr.markForCheck();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/my-events']);
  }
}