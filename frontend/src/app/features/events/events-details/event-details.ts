import { ChangeDetectorRef, Component, inject } from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, Location, UpperCasePipe } from '@angular/common';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import {UnregisterRequest} from '../../../core/models/registration.model'

import {EmployeeInviteRequest, InvitationCreatedItemResponse, InvitationSkippedItemResponse} from '../../../core/models/invitation.model'
import { UserSummary } from '../../../core/models/user-summary.model';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, UpperCasePipe],
  templateUrl: './event-details.html',
  styleUrl: './event-details.css'
})
export class EventDetails {
  private route = inject(ActivatedRoute);
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(Location);
  private authService = inject(AuthService);


  event: EventResponse | null = null;
  loading = false;
  actionLoading = false;
  errorMessage = '';
  successMessage = '';
  isRegistered = false;

  showUnregisterModal = false;
  unregisterLoading = false;
  unregisterErrorMessage = '';

  unregisterReason = '';
  unregisterComment = '';

  users: UserSummary[] = [];

  showEmployeeInvitePanel = false;
  employeeInviteLoading = false;
  employeeInviteErrorMessage = '';
  employeeInviteSuccessMessage = '';

  employeeInviteSearchTerm = '';
  selectedEmployeeInviteEmails: string[] = [];
  employeeInviteMessage = '';

  employeeInvitedItems: InvitationCreatedItemResponse[] = [];
  employeeSkippedItems: InvitationSkippedItemResponse[] = [];

  readonly unregisterReasons: string[] = [
    'Conflit d’horaire',
    'Changement de priorité',
    'Je ne peux plus participer',
    'Erreur d’inscription',
    'Autre'
  ];


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
            this.loadInvitableUsers();
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

  private loadInvitableUsers(): void {
    this.eventService.getEmployeeInvitableUsers(this.event!.id).subscribe({
      next: (users) => {
        this.users = users ?? [];
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.users = [];
        this.employeeInviteErrorMessage =
          err?.error?.message ||
          err?.error ||
          'Impossible de charger la liste des collaborateurs.';
        this.cdr.markForCheck();
      }
    });
  }

  get currentUserDepartmentId(): number | null {
    return this.authService.getCurrentUserSnapshot()?.departmentId ?? null;
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

  openUnregisterModal(): void {
    if (!this.event || !this.isRegistered) return;

    this.unregisterErrorMessage = '';
    this.unregisterReason = '';
    this.unregisterComment = '';
    this.showUnregisterModal = true;
    this.cdr.markForCheck();
  }

  closeUnregisterModal(): void {
    this.showUnregisterModal = false;
    this.unregisterLoading = false;
    this.unregisterErrorMessage = '';
    this.cdr.markForCheck();
  }

  confirmUnregister(): void {
    if (!this.event) return;

    if (!this.unregisterReason.trim()) {
      this.unregisterErrorMessage = 'Veuillez sélectionner une raison de désinscription.';
      this.cdr.markForCheck();
      return;
    }

    const payload: UnregisterRequest = {
      reason: this.unregisterReason.trim(),
      comment: this.unregisterComment.trim() ? this.unregisterComment.trim() : null
    };

    this.unregisterLoading = true;
    this.unregisterErrorMessage = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.eventService.unregisterFromEvent(this.event.id, payload)
      .pipe(finalize(() => {
        this.unregisterLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.isRegistered = false;
          this.showUnregisterModal = false;
          this.successMessage = 'Désinscription effectuée.';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.unregisterErrorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de vous désinscrire de cet événement.';
          this.cdr.markForCheck();
        }
      });
  }

  get isEventFull(): boolean {
    return !!this.event && (this.event.registeredCount || 0) >= this.event.capacity;
  }

  get isEventOpenForInvites(): boolean {
    if (!this.event) return false;
    return this.event.status === 'PUBLISHED' && !this.isEventFull;
  }

  get canInviteColleagues(): boolean {
    return this.authService.hasEmployeeRole() && this.isEventOpenForInvites && this.isRegistered;
  }

  get canShowInviteHint(): boolean {
    return this.authService.hasEmployeeRole() && this.isEventOpenForInvites && !this.isRegistered;
  }

  get invitableUsers(): UserSummary[] {
    return this.users ?? [];
  }

  get targetDepartmentIdForInvitation(): number | null {
    if (!this.event) return null;

    if (this.event.targetDepartmentId !== null && this.event.targetDepartmentId !== undefined) {
      return Number(this.event.targetDepartmentId);
    }

    if (this.event.audience === 'DEPARTMENT') {
      return this.currentUserDepartmentId;
    }

    return null;
  }

  get filteredInvitableUsers(): UserSummary[] {
    const search = this.employeeInviteSearchTerm.trim().toLowerCase();

    if (!search) {
      return this.invitableUsers;
    }

    return this.invitableUsers.filter(user => {
      const firstName = user.firstName?.toLowerCase() ?? '';
      const lastName = user.lastName?.toLowerCase() ?? '';
      const email = user.email?.toLowerCase() ?? '';
      const fullName = `${firstName} ${lastName}`.trim();

      return firstName.includes(search)
        || lastName.includes(search)
        || fullName.includes(search)
        || email.includes(search);
    });
  }
  get selectedEmployeeInviteCount(): number {
    return this.selectedEmployeeInviteEmails.length;
  }

  toggleEmployeeInvitePanel(): void {
    this.showEmployeeInvitePanel = !this.showEmployeeInvitePanel;
    this.employeeInviteErrorMessage = '';
    this.employeeInviteSuccessMessage = '';
    this.cdr.markForCheck();
  }

  onEmployeeInviteSelectionChange(email: string, checked: boolean): void {
    if (checked) {
      if (!this.selectedEmployeeInviteEmails.includes(email)) {
        this.selectedEmployeeInviteEmails = [...this.selectedEmployeeInviteEmails, email];
      }
    } else {
      this.selectedEmployeeInviteEmails = this.selectedEmployeeInviteEmails.filter(e => e !== email);
    }

    this.cdr.markForCheck();
  }

  sendEmployeeInvites(): void {
    if (!this.event) return;

    if (this.selectedEmployeeInviteEmails.length === 0) {
      this.employeeInviteErrorMessage = 'Veuillez sélectionner au moins un collaborateur.';
      this.cdr.markForCheck();
      return;
    }

    const payload: EmployeeInviteRequest = {
      userEmails: this.selectedEmployeeInviteEmails,
      message: this.employeeInviteMessage.trim() ? this.employeeInviteMessage.trim() : null
    };

    this.employeeInviteLoading = true;
    this.employeeInviteErrorMessage = '';
    this.employeeInviteSuccessMessage = '';
    this.employeeInvitedItems = [];
    this.employeeSkippedItems = [];
    this.cdr.markForCheck();

    this.eventService.sendEmployeeInvitations(this.event.id, payload)
      .pipe(finalize(() => {
        this.employeeInviteLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.employeeInviteSuccessMessage = response.message;
          this.employeeInvitedItems = response.invitedItems ?? [];
          this.employeeSkippedItems = response.skippedItems ?? [];
          this.selectedEmployeeInviteEmails = [];
          this.employeeInviteMessage = '';
          this.employeeInviteSearchTerm = '';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.employeeInviteErrorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible d’envoyer les invitations.';
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
