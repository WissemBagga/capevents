import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, Location, UpperCasePipe } from '@angular/common';
import { finalize, forkJoin  } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';

import {EventParticipantResponse, AttendanceStatus} from '../../../core/models/participant.model'

import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { SendInvitationRequest, InvitationTargetType, AdminEventInvitationResponse, InvitationCreatedItemResponse, InvitationSkippedItemResponse,  InvitationResponseStatus } from '../../../core/models/invitation.model';
import { UserSummary } from '../../../core/models/user-summary.model';
import { Department } from '../../../core/models/department.model';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-admin-event-details',
  standalone: true,
  imports: [RouterLink, DatePipe, UpperCasePipe, FormsModule],
  templateUrl: './admin-event-details.html',
  styleUrl: './admin-event-details.css'
})
export class AdminEventDetails {
  private route = inject(ActivatedRoute);
  private eventService = inject(EventService);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(Location);

  private userService = inject(UserService)
  private authService = inject(AuthService)

  event: EventResponse | null = null;
  loading = false;
  errorMessage = '';

  participants: EventParticipantResponse[]= [];
  participantsLoading = false;


  showInvitationPanel = false;
  invitationLoading = false;
  invitationErrorMessage = '';
  invitationSuccessMessage = '';

  invitationTargetType: InvitationTargetType = 'GLOBAL';
  selectedDepartmentId: number | null = null;
  selectedUserEmails: string[] = [];
  invitationMessage = '';

  users : UserSummary[] = [];
  departments : Department[] = [];

  invitations: AdminEventInvitationResponse[] = [];
  invitationsLoading = false;

  lastInvitedItems: InvitationCreatedItemResponse[] = [];
  lastSkippedItems: InvitationSkippedItemResponse[] = [];

  individualSearchTerm = '';
  individualDepartmentFilter: number | null = null;


  attendanceLoadingById: Record<number, boolean> = {};


  showRescheduleModal = false;
  rescheduleLoading = false;
  rescheduleErrorMessage = '';

  rescheduleStartAt = '';
  rescheduleRegistrationDeadline = '';
  successMessage = '';

  get isHr(): boolean{
    return this.authService.isHr();
  }

  get isManager(): boolean{
    return this.authService.isManager();
  }

  get currentUserDepartmentId(): number | null {
    return this.authService.getCurrentUserSnapshot()?.departmentId ?? null;
  }


  get visibleUsersForInvitation(): UserSummary[] {
    let users = this.users.filter(user => user.active);

    if (this.isDepartmentAudienceEvent && this.eventTargetDepartmentId !== null) {
      return users.filter(user => user.departmentId === this.eventTargetDepartmentId);
    }

    if (this.isHr) {
      return users;
    }

    return users.filter(user => user.departmentId === this.currentUserDepartmentId);
  }

  get filteredSelectableUsers(): UserSummary[] {
    const search = this.individualSearchTerm.trim().toLowerCase();

    let users = [...this.visibleUsersForInvitation];

    if (this.isHr && this.individualDepartmentFilter !== null) {
      users = users.filter(user => user.departmentId === this.individualDepartmentFilter);
    }

    if (!search) {
      return users;
    }

    return users.filter(user => {
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

  get canShowDepartmentInSentInvitations(): boolean {
    return this.isHr;
  }

  clearIndividualFilters(): void {
    this.individualSearchTerm = '';
    this.individualDepartmentFilter = null;
    this.cdr.markForCheck();
  }

  get selectedCount(): number {
    if (this.invitationTargetType === 'GLOBAL') {
      return this.visibleUsersForInvitation.length;
    }

    if (this. invitationTargetType === 'DEPARTMENT') {
      if (!this. selectedDepartmentId){
        return 0
      } ;

      return this.users.filter(
        user => user.active && user.departmentId === this.selectedDepartmentId
      ).length;
    }
    return this.selectedUserEmails.length;
  }

  get canSendInvitations(): boolean {
    if (this.invitationLoading || !this.event) {
      return false;
    }

    if (this.invitationTargetType === 'DEPARTMENT') {
      return this.selectedDepartmentId !== null;
    }

    if (this.invitationTargetType === 'INDIVIDUAL') {
      return this.selectedUserEmails.length > 0;
    }

    return true;
  }

  get showInvitationSection(): boolean {
    return !!this.event && this.event.status === 'PUBLISHED';
  }

  get invitationBlockingMessage(): string {
    if (!this.event || this.event.status !== 'PUBLISHED') {
      return '';
    }

    if (this.event.remainingCapacity != null && this.event.remainingCapacity <= 0) {
      return 'Invitations indisponibles : la capacité de l’événement est complète.';
    }

    if (this.event.registrationDeadline) {
      const deadlinePassed = new Date(this.event.registrationDeadline).getTime() <= Date.now();
      if (deadlinePassed) {
        return 'Invitations indisponibles : la date limite d’inscription est dépassée.';
      }
    }

    return '';
  }

  get canInviteNow(): boolean {
    return this.showInvitationSection && this.invitationBlockingMessage === '';
  }


  ngOnInit(): void {
    this.setDefaultInvitationState();

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage = 'Identifiant de l’événement manquant.';
      this.cdr.markForCheck();
      return;
    }

    this.loadEvent(id);
    this.loadDepartments();
    this.loadUsers();

  }

  markAttendance(registrationId: number, attendanceStatus: AttendanceStatus): void {
    this.attendanceLoadingById[registrationId] = true;
    this.cdr.markForCheck();

    this.eventService.markAttendance(registrationId, attendanceStatus)
      .pipe(finalize(() => {
        this.attendanceLoadingById[registrationId] = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.participants = this.participants.map(participant =>
            participant.registrationId === registrationId
              ? { ...participant, attendanceStatus }
              : participant
          );

          this.cdr.markForCheck();
        },
        error: () => {
          this.cdr.markForCheck();
        }
      });
  }


  private setDefaultInvitationState(): void {
    if (this.isManager && !this.isHr) {
      this.invitationTargetType = 'DEPARTMENT';
      this.selectedDepartmentId = this.currentUserDepartmentId;
    } else {
      this.invitationTargetType = 'GLOBAL';
      this.selectedDepartmentId = null;
    }
  }


  private loadEvent(id: string): void{
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
          this.loadInvitations(event.id);
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


  private loadUsers(): void {
    this.userService.getAllUsers(0, 1000).subscribe({
      next: (response) => {
        this.users = response.items ?? [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.users = [];
        this.cdr.markForCheck();
      }
    });
  }


  private loadDepartments(): void {
    this.userService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments ?? [];

        if (this.isManager && !this.isHr ) {
          this.selectedDepartmentId = this.currentUserDepartmentId;
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.departments = [];
        this.cdr.markForCheck();
      }
    });
  }

  toggleInvitationPanel(): void {
    if (!this.canInviteNow) {
      return;
    }

    this.showInvitationPanel = !this.showInvitationPanel;
    this.invitationErrorMessage = '';
    this.invitationSuccessMessage = '';

    if (this.showInvitationPanel) {
      if (this.isDepartmentAudienceEvent) {
        this.invitationTargetType = 'DEPARTMENT';
        this.selectedDepartmentId = this.eventTargetDepartmentId;
      } else if (this.isManager && !this.isHr) {
        this.invitationTargetType = 'DEPARTMENT';
        this.selectedDepartmentId = this.currentUserDepartmentId;
      }
    }

    this.cdr.markForCheck();
  }

  onTargetTypeChange(value: InvitationTargetType): void {
    if (this.isDepartmentAudienceEvent && value === 'GLOBAL') {
      this.invitationErrorMessage = 'Le mode Global est interdit pour un événement départemental.';
      this.cdr.markForCheck();
      return;
    }

    this.invitationTargetType = value;
    this.invitationErrorMessage = '';
    this.invitationSuccessMessage = '';
    this.individualSearchTerm = '';
    this.individualDepartmentFilter = null;

    if (this.isDepartmentAudienceEvent) {
      this.selectedDepartmentId = this.eventTargetDepartmentId;
    } else if (value !== 'DEPARTMENT') {
      this.selectedDepartmentId = this.isManager && !this.isHr
        ? this.currentUserDepartmentId
        : null;
    }

    if (this.invitationTargetType !== 'INDIVIDUAL') {
      this.selectedUserEmails = [];
    }

    this.cdr.markForCheck();
  }

  onIndividualSelectionChange(email: string, checked: boolean): void {
    if (checked) {
      if (!this.selectedUserEmails.includes(email)) {
        this.selectedUserEmails = [...this.selectedUserEmails, email];
      }
    } else {
      this.selectedUserEmails = this.selectedUserEmails.filter(e => e !== email);
    }

    this.cdr.markForCheck();
  }

  sendInvitations(): void {
    if (!this.event){
      return;
    }


    this.invitationErrorMessage = '';
    this.invitationSuccessMessage = '';
    this.lastInvitedItems = [];
    this.lastSkippedItems = [];


    if (this.invitationTargetType === 'DEPARTMENT' && !this.selectedDepartmentId){
      this.invitationErrorMessage= 'Veuillez sélectionner un département.';
      this.cdr.markForCheck();
      return;
    }

    if (this.invitationTargetType === 'INDIVIDUAL' && this.selectedUserEmails.length === 0) {
      this.invitationErrorMessage = 'Veuillez sélectionner au moins un utilisateur.';
      this.cdr.markForCheck();
      return;
    }

    if (this.isDepartmentAudienceEvent) {
      if (this.invitationTargetType === 'GLOBAL') {
        this.invitationErrorMessage = 'Les invitations globales sont interdites pour un événement départemental.';
        this.cdr.markForCheck();
        return;
      }

      if (
        this.invitationTargetType === 'DEPARTMENT' &&
        this.selectedDepartmentId !== this.eventTargetDepartmentId
      ) {
        this.invitationErrorMessage = 'Vous devez sélectionner uniquement le département cible de cet événement.';
        this.cdr.markForCheck();
        return;
      }
    }

    const payload: SendInvitationRequest = {
      targetType: this.invitationTargetType,
      departmentId: this.invitationTargetType === 'DEPARTMENT' ? this.selectedDepartmentId : null,
      userEmails: this.invitationTargetType === 'INDIVIDUAL' ? this.selectedUserEmails : [],
      message: this.invitationMessage?.trim() ? this.invitationMessage.trim() : null
    };

    this.invitationLoading = true;
    this.cdr.markForCheck();

    this.eventService.sendInvitations(this.event.id, payload)
      .pipe(finalize(() => {
        this.invitationLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.invitationSuccessMessage = response.message;
          this.lastInvitedItems = response.invitedItems ?? [];
          this.lastSkippedItems = response.skippedItems ?? [];

          if (this.invitationTargetType === 'INDIVIDUAL') {
            this.selectedUserEmails = [];
            this.individualSearchTerm = '';
            this.individualDepartmentFilter = null;
          }

          this.invitationMessage = '';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.invitationErrorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible d’envoyer les invitations.';
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

  private loadInvitations(eventId: string): void {
    this.invitationsLoading = true;
    this.cdr.markForCheck();

    this.eventService.getEventInvitations(eventId)
      .pipe(finalize(() => {
        this.invitationsLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (invitations) => {
          this.invitations = invitations ?? [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.invitations = [];
          this.cdr.markForCheck();
        }
      });
  }


  get isCancelled(): boolean {
    return this.event?.status === 'CANCELLED';
  }

  get isArchived(): boolean {
    return this.event?.status === 'ARCHIVED';
  }

  get canShowParticipationSections(): boolean {
    return !!this.event && !this.isCancelled && !this.isArchived;
  }

  openRescheduleModal(): void {
    if (!this.event) return;

    this.rescheduleErrorMessage = '';
    this.rescheduleStartAt = this.toDateTimeLocal(this.event.startAt);
    this.rescheduleRegistrationDeadline = this.toDateTimeLocal(this.event.registrationDeadline);
    this.showRescheduleModal = true;
    this.cdr.markForCheck();
  }

  closeRescheduleModal(): void {
    this.showRescheduleModal = false;
    this.rescheduleLoading = false;
    this.rescheduleErrorMessage = '';
    this.cdr.markForCheck();
  }

  private toDateTimeLocal(value: string | null | undefined): string {
    if (!value) return '';

    const date = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private validateReschedule(): string | null {
    if (!this.rescheduleStartAt) {
      return 'La nouvelle date de l’événement est obligatoire.';
    }

    if (!this.rescheduleRegistrationDeadline) {
      return 'La nouvelle date limite d’inscription est obligatoire.';
    }

    const startAt = new Date(this.rescheduleStartAt);
    const deadline = new Date(this.rescheduleRegistrationDeadline);
    const now = new Date();

    if (startAt <= now) {
      return 'La nouvelle date de l’événement doit être dans le futur.';
    }

    if (deadline <= now) {
      return 'La nouvelle date limite doit être dans le futur.';
    }

    if (deadline >= startAt) {
      return 'La date limite d’inscription doit être avant la date de l’événement.';
    }

    return null;
  }

  private buildReschedulePayload() {
    if (!this.event) return null;

    return {
      title: this.event.title,
      category: this.event.category || '',
      description: this.event.description || '' ,
      startAt: new Date(this.rescheduleStartAt).toISOString(),
      durationMinutes: this.event.durationMinutes,
      locationType: this.event.locationType,
      locationName: this.event.locationName || '',
      address: this.event.address || '',
      meetingUrl: this.event.meetingUrl || '',
      capacity: this.event.capacity,
      registrationDeadline: new Date(this.rescheduleRegistrationDeadline).toISOString(),
      imageUrl: this.event.imageUrl || '',
      audience: this.event.audience,
      targetDepartmentId: this.event.targetDepartmentId
    };
  }

  submitReschedule(): void {
    if (!this.event) return;

    this.rescheduleErrorMessage = '';

    const validationError = this.validateReschedule();
    if (validationError) {
      this.rescheduleErrorMessage = validationError;
      this.cdr.markForCheck();
      return;
    }

    const payload = this.buildReschedulePayload();
    if (!payload) return;

    this.rescheduleLoading = true;
    this.cdr.markForCheck();

    this.eventService.updateEvent(this.event.id, payload).subscribe({
      next: () => {
        this.eventService.publishEvent(this.event!.id)
          .pipe(finalize(() => {
            this.rescheduleLoading = false;
            this.cdr.markForCheck();
          }))
          .subscribe({
            next: () => {
              this.showRescheduleModal = false;
              this.successMessage = 'Événement reprogrammé et publié avec succès.';
              this.loadEvent(this.event!.id);
              this.cdr.markForCheck();
            },
            error: (err) => {
              this.rescheduleErrorMessage =
                err?.error?.message ||
                err?.error ||
                'Impossible de publier l’événement après le reschedule.';
              this.cdr.markForCheck();
            }
          });
      },
      error: (err) => {
        this.rescheduleLoading = false;
        this.rescheduleErrorMessage =
          err?.error?.message ||
          err?.error ||
          'Impossible de mettre à jour les nouvelles dates.';
        this.cdr.markForCheck();
      }
    });
  }

  get presentCount(): number {
    return this.participants.filter(p => p.attendanceStatus === 'PRESENT').length;
  }

  get absentCount(): number {
    return this.participants.filter(p => p.attendanceStatus === 'ABSENT').length;
  }

  get pendingCount(): number {
    return this.participants.filter(p => p.attendanceStatus === 'PENDING').length;
  }

  markAllPresent(): void {
    const targets = this.participants
      .filter(p => p.attendanceStatus !== 'PRESENT')
      .map(p => this.eventService.markAttendance(p.registrationId, 'PRESENT'));

    if (targets.length === 0) return;

    this.participantsLoading = true;
    this.cdr.markForCheck();

    forkJoin(targets)
      .pipe(finalize(() => {
        this.participantsLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.participants = this.participants.map(p => ({
            ...p,
            attendanceStatus: 'PRESENT'
          }));
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Impossible de marquer tous les participants comme présents.';
          this.cdr.markForCheck();
        }
      });
  }

  markAllAbsent(): void {
    const targets = this.participants
      .filter(p => p.attendanceStatus !== 'ABSENT')
      .map(p => this.eventService.markAttendance(p.registrationId, 'ABSENT'));

    if (targets.length === 0) return;

    this.participantsLoading = true;
    this.cdr.markForCheck();

    forkJoin(targets)
      .pipe(finalize(() => {
        this.participantsLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.participants = this.participants.map(p => ({
            ...p,
            attendanceStatus: 'ABSENT'
          }));
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Impossible de marquer tous les participants comme absents.';
          this.cdr.markForCheck();
        }
      });
  }

  get isDepartmentAudienceEvent(): boolean {
    return this.event?.audience === 'DEPARTMENT';
  }

  get eventTargetDepartmentId(): number | null {
    return this.event?.targetDepartmentId ?? null;
  }

  get allowedDepartmentsForInvitation(): Department[] {
    if (!this.isDepartmentAudienceEvent || this.eventTargetDepartmentId == null) {
      return this.departments;
    }

    return this.departments.filter(dept => dept.id === this.eventTargetDepartmentId);
  }

  get shouldDisableDepartmentSelect(): boolean {
    if (this.isDepartmentAudienceEvent) {
      return true;
    }
    return this.isManager && !this.isHr;
  }

  get filteredSelectableUserEmails(): string[] {
    return this.filteredSelectableUsers.map(user => user.email);
  }

  get areAllFilteredSelectableUsersSelected(): boolean {
    const emails = this.filteredSelectableUserEmails;
    return emails.length > 0 && emails.every(email => this.selectedUserEmails.includes(email));
  }

  get selectedFilteredSelectableCount(): number {
    const emails = this.filteredSelectableUserEmails;
    return emails.filter(email => this.selectedUserEmails.includes(email)).length;
  }

  toggleSelectAllAdminUsers(checked: boolean): void {
    const emails = this.filteredSelectableUserEmails;

    if (emails.length === 0) {
      return;
    }

    if (checked) {
      this.selectedUserEmails = Array.from(
        new Set([...this.selectedUserEmails, ...emails])
      );
    } else {
      this.selectedUserEmails = this.selectedUserEmails.filter(
        email => !emails.includes(email)
      );
    }

    this.cdr.markForCheck();
  }

  invitationResponseLabel(response: InvitationResponseStatus | null): string {
    switch (response) {
      case 'YES':
        return 'Oui';
      case 'MAYBE':
        return 'Peut-être';
      case 'NO':
        return 'Non';
      default:
        return 'Pas encore répondu';
    }
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
      case 'PRESENT':
        return 'Présent';
      case 'ABSENT':
        return 'Absent';
      default:
        return status;
    }
  }

}
