import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface PublicStatsResponse {
  totalEvents: number;
  publishedEvents: number;
  totalUsers: number;
  totalParticipants: number;
}

@Injectable({
  providedIn: 'root'
})
export class PublicAnalyticsService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/public/stats`;

  getPublicStats() {
    return this.http.get<PublicStatsResponse>(this.apiUrl);
  }
}
