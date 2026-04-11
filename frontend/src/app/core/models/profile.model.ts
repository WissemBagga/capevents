export interface MyProfileResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  departmentId: number | null;
  departmentName: string | null;
  avatarUrl: string | null;
  roles: string[];
}

export interface UpdateMyProfileRequest {
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  avatarUrl: string | null;
}