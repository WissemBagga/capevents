import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UserSummary } from '../models/user-summary.model';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiBaseUrl}/api/auth`;
  private readonly tokenKey = 'capevents_access_token';

  private currentUserSubject = new BehaviorSubject<UserSummary | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((response) => {
        localStorage.setItem(this.tokenKey, response.accessToken);
      })
    );
  }

  register(payload: RegisterRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/register`, payload, {
      responseType: 'text'
    });
  }

  getMe(): Observable<UserSummary> {
    return this.http.get<UserSummary>(`${this.apiUrl}/me`).pipe(
      tap((user) => this.currentUserSubject.next(user))
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/reset-password`,
      { token, newPassword },
      { responseType: 'text' }
    );
  }

  resendVerification(email: string): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/resend-verification`,
      { email },
      { responseType: 'text' }
    );
  }

  verifyEmail(token: string): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/verify-email`,
      { token },
      { responseType: 'text' }
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUserSnapshot(): UserSummary | null {
    return this.currentUserSubject.value;
  }

  async initializeApp(): Promise<void> {
    const token = this.getToken();

    if (!token) {
      this.currentUserSubject.next(null);
      return;
    }

    try {
      const user = await firstValueFrom(this.getMe());
      this.currentUserSubject.next(user);
    } catch {
      this.logout();
    }
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUserSnapshot();
    return !!user && user.roles.includes(role);
  }

  getPrimaryRole(): string | null {
    const user = this.getCurrentUserSnapshot();
    if (!user) return null;

    if (user.roles.includes('ROLE_HR')) return 'ROLE_HR';
    if (user.roles.includes('ROLE_MANAGER')) return 'ROLE_MANAGER';
    if (user.roles.includes('ROLE_EMPLOYEE')) return 'ROLE_EMPLOYEE';

    return null;
  }

  isHr(): boolean {
    return this.getPrimaryRole() === 'ROLE_HR';
  }

  isManager(): boolean {
    return this.getPrimaryRole() === 'ROLE_MANAGER';
  }

  isEmployeeOnly(): boolean {
    return this.getPrimaryRole() === 'ROLE_EMPLOYEE';
  }
}