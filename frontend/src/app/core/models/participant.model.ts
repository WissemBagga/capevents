export type AttendanceStatus = 'PENDING' | 'PRESENT' | 'ABSENT';

export interface EventParticipantResponse {
  registrationId: number;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName: string | null;
  avatarUrl: string | null;
  registeredAt: string;
  attendanceStatus: AttendanceStatus;
}