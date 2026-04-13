export interface RegistrationResponse {
  registrationId: number;
  eventId: string;
  eventTitle: string;
  eventStartAt: string;

  status: 'REGISTERED' | 'CANCELLED';
  registeredAt: string;
  cancelledAt: string | null;

  eventStatus: 'DRAFT' | 'PUBLISHED' | 'PENDING' | 'REJECTED' | 'CANCELLED' | 'ARCHIVED';
  eventCancelReason: string | null;
}

export interface UnregisterRequest {
  reason: string;
  comment: string | null;
}