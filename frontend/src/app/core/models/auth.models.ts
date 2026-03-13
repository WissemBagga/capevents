export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string | null;
  departmentId?: number | null;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
}