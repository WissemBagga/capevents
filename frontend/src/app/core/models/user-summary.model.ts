export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  jobTitle?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  avatarUrl?: string | null;
  active: boolean;
  roles: string[];
}
