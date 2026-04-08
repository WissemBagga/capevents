export interface CreateEventFeedbackRequest {
  rating: number;
  comment: string | null;
}

export interface EventFeedbackResponse {
  id: number;
  eventId: string;
  userId: string;
  userFullName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string | null;
}