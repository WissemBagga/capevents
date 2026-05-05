export interface InvitationReminderResponse {
  eventId: string;
  eventTitle: string;
  eligibleInvitations: number;
  remindersSent: number;
  remindersFailed: number;
  message: string;
}