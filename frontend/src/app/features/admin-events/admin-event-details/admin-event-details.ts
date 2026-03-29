import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, Location, UpperCasePipe } from '@angular/common';
import { finalize } from 'rxjs';

import { EventService } from '../../../core/services/event.service';
import { EventResponse } from '../../../core/models/event.model';

import {EventParticipantResponse} from '../../../core/models/participant.model'

import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { SendInvitationRequest, InvitationTargetType, AdminEventInvitationResponse } from '../../../core/models/invitation.model';
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
    if (this.isHr) {
      return this.users.filter(user => user.active);
    }

    return this.users.filter(
      user => user.active && user.departmentId === this.currentUserDepartmentId
    );
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

    if (this.showInvitationPanel && this.isManager && !this.isHr) {
      this.invitationTargetType = 'DEPARTMENT';
      this.selectedDepartmentId = this.currentUserDepartmentId;
    }

    this.cdr.markForCheck();
  }

  onTargetTypeChange(value: InvitationTargetType): void {
    this.invitationTargetType = value;
    this.invitationErrorMessage = '';
    this.invitationSuccessMessage = '';

    if (value !== 'DEPARTMENT') {
      this.selectedDepartmentId = this.isManager && !this.isHr
        ? this.currentUserDepartmentId
        : null;
    }

    if (this.invitationTargetType !== 'INDIVIDUAL') {
      this.selectedUserEmails = [];
    }

    if (this.isManager && !this.isHr && this.invitationTargetType !== 'DEPARTMENT' ) {
      this.selectedDepartmentId = this.currentUserDepartmentId;
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

          if (this.invitationTargetType === 'INDIVIDUAL') {
            this.selectedUserEmails = [];
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