export interface CreateEventFeedbackRequest {
  rating: number;
  comment: string | null;
  shareCommentPublicly: boolean;
}

export interface EventFeedbackResponse {
  id: string;
  eventId: string;
  userId: string;
  fullName: string;
  rating: number;
  comment: string | null;
  shareCommentPublicly: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicFeedbackItemResponse {
  rating: number;
  comment: string;
}

export interface PastEventCardResponse {
  eventId: string;
  title: string;
  category: string | null;
  imageUrl: string | null;
  departmentName: string;
  audience: string;
  startAt: string;
  averageRating: number;
  feedbackCount: number;
  presentCount: number;
  teaser: string;
}

export interface PastEventFeedbackDetailsResponse {
  eventId: string;
  title: string;
  category: string | null;
  imageUrl: string | null;
  departmentName: string;
  audience: string;
  startAt: string;
  averageRating: number;
  feedbackCount: number;
  feedbackResponseRate: number;
  presentCount: number;
  highlights: string[];
  improvementPoints: string[];
  publicComments: PublicFeedbackItemResponse[];
}