import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, Location, UpperCasePipe } from '@angular/common';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';

import {EventParticipantResponse} from '../../../core/models/participant.model'

@Component({
  selector: 'app-admin-event-details',
  standalone: true,
  imports: [RouterLink, DatePipe, UpperCasePipe],
  templateUrl: './admin-event-details.html',
  styleUrl: './admin-event-details.css'
})
export class AdminEventDetails {
  private route = inject(ActivatedRoute);
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(Location);

  event: EventResponse | null = null;
  loading = false;
  errorMessage = '';

  participants: EventParticipantResponse[]= [];
  participantsLoading = false;


  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage = 'Identifiant de l’événement manquant.';
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.eventService.getAdminById(id)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (event) => {
          this.event = event;
          this.loadParticipants(event.id);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger les détails admin de l’événement.';
          this.cdr.markForCheck();
        }
      });
  }

  private loadParticipants(eventId: string): void{
    this.participantsLoading = true;
    this.cdr.markForCheck();

    this.eventService.getEventParticipants(eventId)
      .pipe(finalize(()=> {
        this.participantsLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (participants) => {
          this.participants = participants;
          this.cdr.markForCheck();
        },
        error: () =>{
          this.participants =[];
          this.cdr.markForCheck();
        }
      });

  }

  goBack(): void {
    this.location.back();
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

}