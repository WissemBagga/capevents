export interface RegistrationResponse {
  id: number;
  eventId: string;
  eventTitle: string;
  status: 'REGISTERED' | 'CANCELLED';
  registeredAt: string;
  cancelledAt: string | null;
}