export type InvitationTargetType = 'GLOBAL' | 'DEPARTMENT' | 'INDIVIDUAL';

export interface SendInvitationRequest {
targetType: InvitationTargetType;
departmentId: number | null;
userEmails: string[];
message: string | null;
}

export interface SendInvitationResponse {
  createdCount: number;
  skippedCount: number;
  message: string;
  invitedItems: InvitationCreatedItemResponse[];
  skippedItems: InvitationSkippedItemResponse[];
}

export interface AdminEventInvitationResponse {
  fullName: string;
  email: string;
  departmentName: string | null;
  targetType: InvitationTargetType;
  status: 'PENDING';
  rsvpResponse: InvitationResponseStatus | null;
  message: string | null;
  sentAt: string;
  invitedByFullName: string;
}

export type InvitationResponseStatus  = 'YES' | 'MAYBE' | 'NO';

export interface MyInvitationResponse {
  invitationId: number;
  eventId: string;
  eventTitle: string;
  eventStartAt: string;
  targetType: InvitationTargetType;
  status: 'PENDING';
  rsvpResponse: InvitationResponseStatus | null;
  message: string | null;
  sentAt: string;
  invitedByFullName: string;
  invitationSource: 'ADMIN' | 'COLLEAGUE';
}


export interface InvitationCreatedItemResponse {
  fullName: string;
  email: string;
}

export interface InvitationSkippedItemResponse {
  fullName: string;
  email: string;
  reason: string;
}

export interface EmployeeInviteRequest {
  userEmails: string[];
  message: string | null;
}