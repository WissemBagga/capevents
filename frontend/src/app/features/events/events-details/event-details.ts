import { ChangeDetectorRef, Component, inject } from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, Location, UpperCasePipe } from '@angular/common';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import {UnregisterRequest} from '../../../core/models/registration.model'

import {EmployeeInviteRequest, InvitationCreatedItemResponse, InvitationSkippedItemResponse, AdminEventInvitationResponse, InvitationResponseStatus} from '../../../core/models/invitation.model'
import { UserSummary } from '../../../core/models/user-summary.model';
import { Router } from '@angular/router';

import { getDefaultEventImage } from '../../../core/constants/event-image-presets';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [DatePipe, FormsModule, ScrollToMessageDirective],
  templateUrl: './event-details.html',
  styleUrl: './event-details.css'
})
export class EventDetails {
  private route = inject(ActivatedRoute);
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(Location);
  private authService = inject(AuthService);
  private router = inject(Router);

  userAvatarErrors: Record<string, boolean> = {};
  sentInvitationAvatarErrors: Record<string, boolean> = {};


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

  sentInvitations: AdminEventInvitationResponse[] = [];
  sentInvitationsLoading = false;

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
          }
        },
        error: (err) => {
          const status = err?.status;

          if (status === 404) {
            this.router.navigate(['/not-found']);
            return;
          }

          if (status === 403) {
            this.router.navigate(['/forbidden']);
            return;
          }

          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger cet événement.';
          this.cdr.markForCheck();
        }
      });
  }

  private loadInvitableUsers(): void {
    if (!this.event || !this.hasDepartmentForColleagueInvite) {
      this.users = [];
      this.cdr.markForCheck();
      return;
    }

    this.eventService.getEmployeeInvitableUsers(this.event.id).subscribe({
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

  get hasDepartmentForColleagueInvite(): boolean {
    return this.currentUserDepartmentId !== null;
  }

  private loadMySentInvitations(): void {
    if (!this.event) return;

    this.sentInvitationsLoading = true;
    this.cdr.markForCheck();

    this.eventService.getMySentInvitations(this.event.id)
      .pipe(finalize(() => {
        this.sentInvitationsLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (invitations) => {
          this.sentInvitations = invitations ?? [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.sentInvitations = [];
          this.cdr.markForCheck();
        }
      });
  }



  private loadRegistrationStatus(eventId: string): void {
    this.eventService.getRegistrationStatus(eventId).subscribe({
      next: (registered) => {
        this.isRegistered = registered;

        if (this.isRegistered && !this.isDeadlinePassed && this.hasDepartmentForColleagueInvite) {
          this.loadInvitableUsers();
          this.loadMySentInvitations();
        } else {
          this.users = [];
          this.sentInvitations = [];
          this.showEmployeeInvitePanel = false;
          this.selectedEmployeeInviteEmails = [];
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.isRegistered = false;
        this.users = [];
        this.sentInvitations = [];
        this.showEmployeeInvitePanel = false;
        this.selectedEmployeeInviteEmails = [];
        this.cdr.markForCheck();
      }
    });
  }

  private incrementCapacity(): void {
    if (!this.event) return;

    const currentRegistered = this.event.registeredCount ?? 0;
    const capacity = this.event.capacity ?? 0;
    const nextRegistered = Math.min(currentRegistered + 1, capacity);

    this.event = {
      ...this.event,
      registeredCount: nextRegistered,
      remainingCapacity: Math.max(capacity - nextRegistered, 0)
    };
  }

  private decrementCapacity(): void {
    if (!this.event) return;

    const currentRegistered = this.event.registeredCount ?? 0;
    const capacity = this.event.capacity ?? 0;
    const nextRegistered = Math.max(currentRegistered - 1, 0);

    this.event = {
      ...this.event,
      registeredCount: nextRegistered,
      remainingCapacity: Math.max(capacity - nextRegistered, 0)
    };
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
          if (!this.isDeadlinePassed) {
            this.loadInvitableUsers();
          }
          this.incrementCapacity();
          this.successMessage = 'Inscription réussie.';
          this.loadMySentInvitations();
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
    if (this.hasPendingSentInvitations) {
      this.successMessage = '';
      this.errorMessage = this.unregisterBlockingMessage;
      this.cdr.markForCheck();
      return;
    }
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
          this.decrementCapacity();
          this.showUnregisterModal = false;
          this.successMessage = 'Désinscription effectuée.';
          this.users = [];
          this.showEmployeeInvitePanel = false;
          this.selectedEmployeeInviteEmails = [];
          this.sentInvitations = [];
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

  get canInviteColleagues(): boolean {
    return this.authService.hasEmployeeRole()
      && !!this.event
      && !this.isDeadlinePassed
      && this.isRegistered
      && this.hasDepartmentForColleagueInvite;
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

  get invitationBlockingMessage(): string {
    if (!this.event) {
      return '';
    }

    if (!this.isRegistered) {
      return "Vous devez d'abord vous inscrire à cet événement avant d'inviter des collègues.";
    }

    if (!this.hasDepartmentForColleagueInvite) {
      return "L’invitation entre collègues n’est pas disponible pour un utilisateur sans département. Utilisez l’invitation administrateur.";
    }

    if (this.isDeadlinePassed) {
      return "Les invitations aux collègues sont fermées : la date limite d'inscription est dépassée.";
    }

    return '';
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
    if (!this.isRegistered) {
      this.showEmployeeInvitePanel = false;
      this.employeeInviteErrorMessage =
        "Vous devez d'abord vous inscrire à cet événement avant d'inviter des collègues.";
      this.employeeInviteSuccessMessage = '';
      this.cdr.markForCheck();
      return;
    }

    if (!this.hasDepartmentForColleagueInvite) {
      this.showEmployeeInvitePanel = false;
      this.employeeInviteErrorMessage =
        "L’invitation entre collègues n’est pas disponible pour un utilisateur sans département.";
      this.employeeInviteSuccessMessage = '';
      this.cdr.markForCheck();
      return;
    }

    if (this.isDeadlinePassed) {
      this.showEmployeeInvitePanel = false;
      this.employeeInviteErrorMessage =
        "Les invitations aux collègues sont fermées : la date limite d'inscription est dépassée.";
      this.employeeInviteSuccessMessage = '';
      this.cdr.markForCheck();
      return;
    }

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
    if (!this.isRegistered) {
      this.employeeInviteErrorMessage =
        "Vous devez d'abord vous inscrire à cet événement avant d'inviter des collègues.";
      this.cdr.markForCheck();
      return;
    }

    if (!this.hasDepartmentForColleagueInvite) {
      this.employeeInviteErrorMessage =
        "L’invitation entre collègues n’est pas disponible pour un utilisateur sans département.";
      this.cdr.markForCheck();
      return;
    }
    if (this.isDeadlinePassed) {
      this.showEmployeeInvitePanel = false;
      this.employeeInviteErrorMessage =
        'Impossible d’envoyer des invitations après la date limite d’inscription.';
      this.cdr.markForCheck();
      return;
    }
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
          this.loadMySentInvitations();
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

  get filteredInvitableUserEmails(): string[] {
    return this.filteredInvitableUsers.map(user => user.email);
  }

  get areAllFilteredInvitableUsersSelected(): boolean {
    const emails = this.filteredInvitableUserEmails;
    return emails.length > 0 && emails.every(email => this.selectedEmployeeInviteEmails.includes(email));
  }

  get selectedFilteredInvitableCount(): number {
    const emails = this.filteredInvitableUserEmails;
    return emails.filter(email => this.selectedEmployeeInviteEmails.includes(email)).length;
  }

  toggleSelectAllEmployeeInvitableUsers(checked: boolean): void {
    const emails = this.filteredInvitableUserEmails;

    if (emails.length === 0) {
      return;
    }

    if (checked) {
      this.selectedEmployeeInviteEmails = Array.from(
        new Set([...this.selectedEmployeeInviteEmails, ...emails])
      );
    } else {
      this.selectedEmployeeInviteEmails = this.selectedEmployeeInviteEmails.filter(
        email => !emails.includes(email)
      );
    }

    this.cdr.markForCheck();
  }

  get registrationUnavailableMessage(): string {
    if (!this.event) {
      return '';
    }

    if (this.isDeadlinePassed) {
      return "La date limite d'inscription est dépassée. Les nouvelles inscriptions sont fermées.";
    }

    if (this.isFull && !this.isRegistered) {
      return "Cet événement est complet. Aucune place n’est disponible.";
    }

    return '';
  }

  invitationResponseLabel(response: InvitationResponseStatus | null): string {
    switch (response) {
      case 'YES':
        return 'Acceptée';
      case 'MAYBE':
        return 'Peut-être';
      case 'NO':
        return 'Déclinée';
      default:
        return 'En attente';
    }
  }

  get isFull(): boolean {
    return !!this.event && this.event.remainingCapacity === 0;
  }

  get canRegisterNow(): boolean {
    return !!this.event
      && this.canParticipate
      && !this.isRegistered
      && !this.isDeadlinePassed
      && !this.isFull;
  }

  hasSelectableUserAvatar(user: UserSummary): boolean {
    return !!user.avatarUrl?.trim() && !this.userAvatarErrors[user.id];
  }

  onSelectableUserAvatarError(user: UserSummary): void {
    this.userAvatarErrors[user.id] = true;
    this.cdr.markForCheck();
  }

  getSelectableUserInitials(user: UserSummary): string {
    const first = user.firstName?.charAt(0)?.toUpperCase() ?? '';
    const last = user.lastName?.charAt(0)?.toUpperCase() ?? '';
    return `${first}${last}` || '?';
  }

  getSentInvitationAvatarKey(invitation: AdminEventInvitationResponse): string {
    return `${invitation.email}_${invitation.sentAt}`;
  }

  hasSentInvitationAvatar(invitation: AdminEventInvitationResponse): boolean {
    const key = this.getSentInvitationAvatarKey(invitation);
    return !!invitation.avatarUrl?.trim() && !this.sentInvitationAvatarErrors[key];
  }

  onSentInvitationAvatarError(invitation: AdminEventInvitationResponse): void {
    const key = this.getSentInvitationAvatarKey(invitation);
    this.sentInvitationAvatarErrors[key] = true;
    this.cdr.markForCheck();
  }

  getSentInvitationInitials(fullName: string): string {
    const parts = fullName?.trim().split(' ').filter(Boolean) ?? [];

    if (parts.length === 0) {
      return '?';
    }

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  getRsvpStatusClass(response: InvitationResponseStatus | null): string {
    switch (response) {
      case 'YES':
        return 'rsvp-yes';
      case 'MAYBE':
        return 'rsvp-maybe';
      case 'NO':
        return 'rsvp-no';
      default:
        return 'rsvp-pending';
    }
  }

  get isLateUnregister(): boolean {
    if (!this.event?.startAt) return false;

    const now = new Date().getTime();
    const start = new Date(this.event.startAt).getTime();
    const diffMs = start - now;

    return diffMs > 0 && diffMs < 24 * 60 * 60 * 1000;
  }

  get eventHeroImageUrl(): string {
    if (!this.event) {
      return getDefaultEventImage(null);
    }

    return this.event.imageUrl || getDefaultEventImage(this.event.category);
  }

  get hasPendingSentInvitations(): boolean {
    return this.sentInvitations.some(invitation => !invitation.rsvpResponse);
  }

  get unregisterBlockingMessage(): string {
    if (this.hasPendingSentInvitations) {
      return 'Vous ne pouvez pas vous désinscrire tant que des invitations envoyées sont encore en attente.';
    }

    return '';
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
