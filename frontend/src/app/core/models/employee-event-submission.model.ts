export interface EmployeeEventSubmissionResponse {
  eventId: string;
  status: 'PUBLISHED' | 'PENDING';
  directlyPublished: boolean;
  message: string;
}