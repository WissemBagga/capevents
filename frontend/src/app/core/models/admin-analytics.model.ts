export interface EventEngagementResponse {
  eventId: string;
  title: string;
  status: string;
  registeredCount: number;
  capacity: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

export interface EventFeedbackAnalyticsResponse {
  eventId: string;
  title: string;
  status: string;
  averageRating: number;
  feedbackCount: number;
}

export interface AdminAnalyticsOverviewResponse {
  totalEvents: number;
  publishedEvents: number;
  totalRegistrations: number;
  totalCapacity: number;
  registrationRate: number;
  totalPresent: number;
  totalAbsent: number;
  attendanceRate: number;

  totalFeedbacks: number;
  averageRating: number;
  feedbackResponseRate: number;
  topRatedEvents: EventFeedbackAnalyticsResponse[];

  topEngagingEvents: EventEngagementResponse[];
}