import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { MyPointsResponse } from '../models/points.model';

@Injectable({
  providedIn: 'root'
})
export class PointService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/me/points`;

  getMyPoints(limit = 20) {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<MyPointsResponse>(this.apiUrl, { params });
  }

  getLeaderboard() {
    return this.http.get<any>(`${this.apiUrl}/leaderboard`);
  }
}