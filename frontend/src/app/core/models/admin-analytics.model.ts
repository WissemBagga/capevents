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

export interface AdminAnalyticsOverviewResponse {
  totalEvents: number;
  publishedEvents: number;
  totalRegistrations: number;
  totalCapacity: number;
  registrationRate: number;
  totalPresent: number;
  totalAbsent: number;
  attendanceRate: number;
  topEngagingEvents: EventEngagementResponse[];
}