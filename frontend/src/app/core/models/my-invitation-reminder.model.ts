export interface MyInvitationReminder {
  id: number;
  invitationId: number;
  subject: string | null;
  message: string | null;
  sentByFullName: string | null;
  channel: string;
  status: string;
  sentAt: string;
}