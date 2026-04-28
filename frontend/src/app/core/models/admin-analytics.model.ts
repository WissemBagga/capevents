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

  activeMembers: number;
  pendingProposals: number;
  topMembers: TopMemberAnalyticsResponse[];
  memberRows: TopMemberAnalyticsResponse[];
  monthlyTrend: MonthlyTrendPointResponse[];
  departmentRows: DepartmentAnalyticsRowResponse[];

  topParticipantPerDepartment: DepartmentTopParticipantResponse[];
}

export interface DepartmentAnalyticsRowResponse {
  departmentId: number;
  departmentName: string;
  totalEmployees: number;
  activeEmployees: number;
  participationRate: number;
  averageRating: number | null;
}

export interface TopMemberAnalyticsResponse {
  fullName: string;
  email: string;
  departmentName: string | null;
  registeredCount: number;
  presentCount: number;
  attendanceRate: number;
}

export interface MonthlyTrendPointResponse {
  month: string;
  registrations: number;
}


export interface DepartmentTopParticipantResponse {
  departmentId: number;
  departmentName: string;
  fullName: string;
  email: string;
  registeredCount: number;
  presentCount: number;
  attendanceRate: number;
}