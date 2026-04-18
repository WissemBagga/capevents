export interface EventResponse {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  startAt: string;
  durationMinutes: number;
  locationType: 'ONSITE' | 'ONLINE' | 'EXTERNAL';
  locationName: string | null;
  meetingUrl: string | null;
  address: string | null;
  capacity: number;
  registrationDeadline: string;
  status: 'DRAFT' | 'PUBLISHED' | 'PENDING' | 'REJECTED' | 'CANCELLED' | 'ARCHIVED';

  createdByEmail: string | null;
  createdByFullName: string | null;

  audience: 'GLOBAL' | 'DEPARTMENT';
  targetDepartmentId: number | null;
  targetDepartmentName: string | null;

  cancelReason: string | null;

  createdAt: string | null;
  updatedAt: string | null;
  imageUrl: string | null;


  
  registeredCount?: number;
  remainingCapacity?: number;

  participantAvatarUrls?: string[];

}