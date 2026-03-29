import { ChangeDetectorRef, Component, inject } from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, Location } from '@angular/common';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './event-details.html',
  styleUrl: './event-details.css'
})
export class EventDetails {
  private route = inject(ActivatedRoute);
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(Location);
  private authService = inject(AuthService)


  event: EventResponse | null = null;
  loading = false; 
  actionLoading = false;
  errorMessage = '';
  successMessage = '';
  isRegistered = false;


  get canParticipate(): boolean {
    return this.authService.hasEmployeeRole();
  }

  get isDeadlinePassed(): boolean {
    if (!this.event || !this.event.registrationDeadline) return false;
    return new Date() > new Date(this.event.registrationDeadline);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage = 'Identifiant de l’événement manquant.';
      this.cdr.markForCheck();
      return;
    }

    this.loadEvent(id);
  }

  private loadEvent(id: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.eventService.getPublishedById(id)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (event) => {
          this.event = event;
          this.cdr.markForCheck();

          if (this.authService.isLoggedIn() && this.canParticipate) {
            this.loadRegistrationStatus(event.id);
          }
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger les détails de l’événement.';
          this.cdr.markForCheck();
        }
      });
  }

    private loadRegistrationStatus(eventId: string): void {
    this.eventService.getRegistrationStatus(eventId).subscribe({
      next: (registered) => {
        this.isRegistered = registered;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isRegistered = false;
        this.cdr.markForCheck();
      }
    });
  }


  register(): void {
    if (!this.event) return;

    this.actionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.eventService.registerToEvent(this.event.id)
      .pipe(finalize(() => {
        this.actionLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.isRegistered = true;
          this.successMessage = 'Inscription réussie.';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de vous inscrire à cet événement.';
          this.cdr.markForCheck();
        }
      });
  }

  unregister(): void {
    if (!this.event) return;

    this.actionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.eventService.unregisterFromEvent(this.event.id)
      .pipe(finalize(() => {
        this.actionLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.isRegistered = false;
          this.successMessage = 'Désinscription effectuée.';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de vous dés de cet événement.';
          this.cdr.markForCheck();
        }
      });
  }




   statusLabel(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'Brouillon';
      case 'PUBLISHED':
        return 'Publié';
      case 'CANCELLED':
        return 'Annulé';
      case 'ARCHIVED':
        return 'Archivé';
      case 'PENDING':
        return 'En attente';
      default:
        return status;
    }
  }

  goBack(): void {
    this.location.back();
  }
}