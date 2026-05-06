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

import { Router } from '@angular/router';

import { resolveEventImageUrl, getDefaultEventImage  } from '../../../core/constants/event-image-presets';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

import { AiFeedbackInsightService } from '../../../core/services/ai-feedback-insight.service';
import { AiFeedbackInsightResponse, AiFeedbackTopic } from '../../../core/models/ai-feedback-insight.model';

import { InvitationReminderService } from '../../../core/services/invitation-reminder.service';
import { InvitationReminderHistoryResponse } from '../../../core/models/invitation-reminder-history.model';


@Component({
  selector: 'app-admin-event-details',
  standalone: true,
  imports: [DatePipe, UpperCasePipe, FormsModule, ScrollToMessageDirective],
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
  private router = inject(Router);

  private aiFeedbackInsightService = inject(AiFeedbackInsightService);

  private invitationReminderService = inject(InvitationReminderService);

  event: EventResponse | null = null;
  loading = false;
  errorMessage = '';

  userAvatarErrors: Record<string, boolean> = {};

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

  invitationAvatarErrors: Record<string, boolean> = {};

  showRescheduleModal = false;
  rescheduleLoading = false;
  rescheduleErrorMessage = '';

  rescheduleStartAt = '';
  rescheduleRegistrationDeadline = '';
  successMessage = '';


  aiFeedbackInsight: AiFeedbackInsightResponse | null = null;
  aiFeedbackLoading = false;
  aiFeedbackErrorMessage = '';


  reminderHistory: InvitationReminderHistoryResponse[] = [];
  reminderHistoryLoading = false;
  reminderHistoryErrorMessage = '';
  showReminderHistory = true;

  readonly minFeedbacksForFullAiAnalysis = 5;

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
    if (!this.isAttendanceOpen) {
      this.errorMessage = this.attendanceLockedMessage;
      this.cdr.markForCheck();
      return;
    }
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

  get eventHeroImageUrl(): string {
    if (!this.event) {
      return getDefaultEventImage(null);
    }

    return this.event.imageUrl || getDefaultEventImage(this.event.category);
  }

  getEventImageUrl(event: EventResponse): string {
    return resolveEventImageUrl(event.imageUrl, event.category);
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

          if (this.isHr) {
            this.loadReminderHistory(event.id);
          }
          

          if (this.canRequestFeedbackInsightsFor(event)) {
            this.loadAiFeedbackInsights(event.id);
          } else {
            this.aiFeedbackInsight = null;
            this.aiFeedbackErrorMessage = '';
          }

          this.scrollToRequestedSection();
          this.cdr.markForCheck();
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
            "Impossible de charger les détails de l'événement.";
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


  get participantsCount(): number {
    return this.participants.length;
  }

  getParticipantInitials(participant: EventParticipantResponse): string {
    const first = participant.firstName?.charAt(0)?.toUpperCase() ?? '';
    const last = participant.lastName?.charAt(0)?.toUpperCase() ?? '';
    return `${first}${last}` || '?';
  }

  hasParticipantAvatar(participant: EventParticipantResponse): boolean {
    return !!participant.avatarUrl?.trim();
  }

  markAllPresent(): void {
    if (!this.isAttendanceOpen) {
      this.errorMessage = this.attendanceLockedMessage;
      this.cdr.markForCheck();
      return;
    }

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
    if (!this.isAttendanceOpen) {
      this.errorMessage = this.attendanceLockedMessage;
      this.cdr.markForCheck();
      return;
    }

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

  getInvitationAvatarKey(invitation: AdminEventInvitationResponse): string {
    return `${invitation.email}_${invitation.sentAt}`;
  }

  onInvitationAvatarError(invitation: AdminEventInvitationResponse): void {
    const key = this.getInvitationAvatarKey(invitation);
    this.invitationAvatarErrors[key] = true;
    this.cdr.markForCheck();
  }

  hasInvitationAvatar(invitation: AdminEventInvitationResponse): boolean {
    const key = this.getInvitationAvatarKey(invitation);
    return !!invitation.avatarUrl?.trim() && !this.invitationAvatarErrors[key];
  }

  getInvitationInitials(fullName: string): string {
    const parts = fullName
      ?.trim()
      .split(' ')
      .filter(Boolean) ?? [];

    if (parts.length === 0) {
      return '?';
    }

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  get isAttendanceOpen(): boolean {
    if (!this.event) return false;
    return new Date(this.event.startAt).getTime() <= Date.now();
  }

  get attendanceLockedMessage(): string {
    return "La présence pourra être saisie à partir du début de l’événement.";
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


  private loadAiFeedbackInsights(eventId: string): void {
    this.aiFeedbackLoading = true;
    this.aiFeedbackErrorMessage = '';
    this.aiFeedbackInsight = null;
    this.cdr.markForCheck();

    this.aiFeedbackInsightService.getEventFeedbackInsights(eventId)
      .pipe(finalize(() => {
        this.aiFeedbackLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.aiFeedbackInsight = response;
          this.cdr.markForCheck();
        },
        error: () => {
          this.aiFeedbackInsight = null;
          this.aiFeedbackErrorMessage = 'Impossible de charger l’analyse IA des feedbacks.';
          this.cdr.markForCheck();
        }
      });
  }

  private canRequestFeedbackInsightsFor(event: EventResponse): boolean {
    if (event.status === 'CANCELLED') {
      return false;
    }

    if (event.status === 'ARCHIVED') {
      return true;
    }

    return this.isEventFinished(event);
  }

  private isEventFinished(event: EventResponse): boolean {
    const startAt = new Date(event.startAt).getTime();
    const durationMs = (event.durationMinutes ?? 0) * 60 * 1000;

    return startAt + durationMs <= Date.now();
  }

  get canRequestAiFeedbackInsights(): boolean {
    return !!this.event && this.canRequestFeedbackInsightsFor(this.event);
  }

  get hasAiFeedbackInsight(): boolean {
    return !!this.aiFeedbackInsight;
  }

  get hasEnoughFeedbacksForFullAiAnalysis(): boolean {
    return (this.aiFeedbackInsight?.feedbackCount ?? 0) >= this.minFeedbacksForFullAiAnalysis;
  }

  get hasSmallFeedbackSample(): boolean {
    const count = this.aiFeedbackInsight?.feedbackCount ?? 0;
    return count > 0 && count < this.minFeedbacksForFullAiAnalysis;
  }

  get hasNoFeedbackForAi(): boolean {
    return (this.aiFeedbackInsight?.feedbackCount ?? 0) === 0;
  }

  get aiPositivePercent(): number {
    return this.getSentimentPercent('positive');
  }

  get aiNeutralPercent(): number {
    return this.getSentimentPercent('neutral');
  }

  get aiNegativePercent(): number {
    return this.getSentimentPercent('negative');
  }

  private getSentimentPercent(type: 'positive' | 'neutral' | 'negative'): number {
    if (!this.aiFeedbackInsight?.feedbackCount) {
      return 0;
    }

    const value = this.aiFeedbackInsight.sentimentDistribution[type] ?? 0;
    return Math.round((value / this.aiFeedbackInsight.feedbackCount) * 100);
  }

  formatRating(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '0.0';
    }

    return Number(value).toFixed(1);
  }

  sentimentLabel(value: string): string {
    switch (value) {
      case 'POSITIVE':
        return 'Positif';
      case 'NEGATIVE':
        return 'Négatif';
      case 'NEUTRAL':
        return 'Neutre';
      default:
        return value || 'Neutre';
    }
  }

  sentimentClass(value: string): string {
    switch (value) {
      case 'POSITIVE':
        return 'ai-positive';
      case 'NEGATIVE':
        return 'ai-negative';
      case 'NEUTRAL':
        return 'ai-neutral';
      default:
        return 'ai-neutral';
    }
  }

  trackByAiTopic(_: number, topic: AiFeedbackTopic): number {
    return topic.topicId;
  }

  trackByText(_: number, item: string): string {
    return item;
  }


  loadReminderHistory(eventId: string): void {
    if (!this.isHr) return;

    this.reminderHistoryLoading = true;
    this.reminderHistoryErrorMessage = '';
    this.cdr.markForCheck();

    this.invitationReminderService.getReminderHistory(eventId)
      .pipe(finalize(() => {
        this.reminderHistoryLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (items) => {
          this.reminderHistory = items;
          this.cdr.markForCheck();
        },
        error: () => {
          this.reminderHistory = [];
          this.reminderHistoryErrorMessage = 'Impossible de charger l’historique des relances.';
          this.cdr.markForCheck();
        }
      });
  }

  refreshReminderHistory(): void {
    if (!this.event) return;
    this.loadReminderHistory(this.event.id);
  }

  trackByReminderId(_: number, item: InvitationReminderHistoryResponse): number {
    return item.id;
  }

  reminderChannelLabel(channel: string): string {
    switch (channel) {
      case 'EMAIL':
        return 'Email';
      case 'SYSTEM':
        return 'Notification interne';
      default:
        return channel || 'N/D';
    }
  }

  reminderStatusLabel(status: string): string {
    switch (status) {
      case 'SENT':
        return 'Envoyée';
      case 'FAILED':
        return 'Échec';
      default:
        return status || 'N/D';
    }
  }

  reminderStatusClass(status: string): string {
    switch (status) {
      case 'SENT':
        return 'status-sent';
      case 'FAILED':
        return 'status-failed';
      default:
        return 'status-neutral';
    }
  }

  get reminderHistorySentCount(): number {
    return this.reminderHistory.filter(item => item.status === 'SENT').length;
  }

  get reminderHistoryFailedCount(): number {
    return this.reminderHistory.filter(item => item.status === 'FAILED').length;
  }


  private scrollToRequestedSection(): void {
    const section = this.route.snapshot.queryParamMap.get('section');

    if (!section) return;

    const sectionId = this.resolveSectionElementId(section);

    setTimeout(() => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
  }

  private resolveSectionElementId(section: string): string {
    switch (section) {
      case 'invitations':
        return 'admin-event-invitations-section';

      case 'feedback':
        return 'admin-event-feedback-section';

      case 'reminders':
        return 'admin-event-reminders-section';

      default:
        return 'admin-event-overview-section';
    }
  }

}
