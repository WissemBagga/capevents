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
}

export interface AdminEventInvitationResponse {
  fullName: string;
  email: string;
  departmentName: string | null;
  targetType: InvitationTargetType;
  status: 'PENDING';
  message: string | null;
  sentAt: string;
  invitedByFullName: string;
}