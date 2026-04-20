import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AdminAnalyticsOverviewResponse } from '../models/admin-analytics.model';

@Injectable({
  providedIn: 'root'
})
export class AdminAnalyticsService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/admin/analytics`;

  getOverview(filters?: {
    from?: string;
    to?: string;
    departmentId?: number | null;
    category?: string;
  }) {
    let params = new HttpParams();

    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    if (filters?.departmentId) params = params.set('departmentId', filters.departmentId);
    if (filters?.category?.trim()) params = params.set('category', filters.category.trim());

    return this.http.get<AdminAnalyticsOverviewResponse>(`${this.apiUrl}/overview`, { params });
  }
}