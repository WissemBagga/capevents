import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { RegistrationResponse } from '../../../core/models/registration.model';

@Component({
  selector: 'app-my-events',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './my-events.html',
  styleUrl: './my-events.css'
})
export class MyEvents {
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);

  registrations: RegistrationResponse[] = [];
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadMyRegistrations();
  }

  loadMyRegistrations(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getMyRegistrations()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (registrations) => {
          this.registrations = registrations;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger vos inscriptions.';
          this.cdr.markForCheck();
        }
      });
  }
}