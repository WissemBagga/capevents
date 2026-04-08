import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AdminAnalyticsOverviewResponse } from '../models/admin-analytics.model';

@Injectable({
  providedIn: 'root'
})
export class AdminAnalyticsService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/admin/analytics`;

  getOverview() {
    return this.http.get<AdminAnalyticsOverviewResponse>(`${this.apiUrl}/overview`);
  }
}