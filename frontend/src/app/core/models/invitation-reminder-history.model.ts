export interface InvitationReminderHistoryResponse {
  id: number;
  invitationId: number;

  recipientFullName: string;
  recipientEmail: string;

  sentByFullName: string;
  sentByEmail: string;

  channel: string;
  subject: string | null;
  message: string | null;
  status: string;
  errorMessage: string | null;
  sentAt: string;
}