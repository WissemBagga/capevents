import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NotificationResponse, UnreadNotificationCountResponse } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/me/notifications`;

  getMyNotifications(limit = 10): Observable<NotificationResponse[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<NotificationResponse[]>(this.apiUrl, { params });
  }

  getUnreadCount(): Observable<UnreadNotificationCountResponse> {
    return this.http.get<UnreadNotificationCountResponse>(`${this.apiUrl}/unread-count`);
  }

  markAsRead(notificationId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/read-all`, {});
  }
}