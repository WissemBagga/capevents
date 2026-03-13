export interface CreateEventRequest {
  title: string;
  category: string;
  description: string;
  startAt: string;
  durationMinutes: number;
  locationType: 'ONSITE' | 'ONLINE' | 'EXTERNAL';
  locationName: string | null;
  meetingUrl: string | null;
  address: string | null;
  capacity: number;
  registrationDeadline: string;
  imageUrl: string | null;
  audience: 'GLOBAL' | 'DEPARTMENT';
  targetDepartmentId: number | null;
}