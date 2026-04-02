export interface RegistrationResponse {
  id: number;
  eventId: string;
  eventTitle: string;
  eventStartAt: string;
  status: 'REGISTERED' | 'CANCELLED';
  registeredAt: string;
  cancelledAt: string | null;
}


export interface UnregisterRequest {
  reason: string;
  comment: string | null;
}