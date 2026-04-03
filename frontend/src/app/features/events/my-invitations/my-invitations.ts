import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventService } from '../../../core/services/event.service';

import { inject } from '@angular/core';
import { MyInvitationResponse, InvitationResponseStatus } from '../../../core/models/invitation.model';
import { finalize } from 'rxjs';


@Component({
  selector: 'app-my-invitations',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './my-invitations.html',
  styleUrl: './my-invitations.css',
})
export class MyInvitations implements OnInit{
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);

  invitations: MyInvitationResponse[] =[];
  loading = false;
  errorMessage="";

  responseLoadingById: Record<number, boolean> = {};

  ngOnInit(): void {
      this.loadInvitations();
  }

  private loadInvitations(): void{
    this.loading = true;
    this.errorMessage='';
    this.cdr.markForCheck();

    this.eventService.getMyInvitations()
    .pipe(finalize(()=> {
      this.loading = false;
      this.cdr.markForCheck();
    }))
    .subscribe({
      next:(invitations) => {
        this.invitations = invitations ?? [];
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage =
          err?.error.message ||
          err?.error ||
          'Impossible de charger vos invitations.';
        this.cdr.markForCheck();
      }
    });
  }

  respond(invitationId: number, response: InvitationResponseStatus): void {
    this.responseLoadingById[invitationId] = true;
    this.cdr.markForCheck();

    this.eventService.respondToInvitation(invitationId, response)
      .pipe(finalize(() => {
        this.responseLoadingById[invitationId] = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.invitations = this.invitations.map(invitation =>
            invitation.invitationId === invitationId
              ? { ...invitation, rsvpResponse: response }
              : invitation
          );
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible d’enregistrer votre réponse.';
          this.cdr.markForCheck();
        }
      });
  }

  targetTypeLabel(targetType: string): string {
    switch (targetType) {
      case 'GLOBAL':
        return 'Globale';
      case 'DEPARTMENT':
        return 'Département';
      case 'INDIVIDUAL':
        return 'Individuelle';
      default:
        return targetType;
    }
  }

  invitationSourceLabel(source: 'ADMIN' | 'COLLEAGUE'): string {
    return source === 'ADMIN' ? 'Administration' : 'Collègue';
  }

  hasResponse(invitation: MyInvitationResponse): boolean {
    return invitation.rsvpResponse === 'YES'
      || invitation.rsvpResponse === 'MAYBE'
      || invitation.rsvpResponse === 'NO';
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      default:
        return status;
    }
  }

}
