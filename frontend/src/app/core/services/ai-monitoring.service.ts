import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiMonitoringService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/ai/monitoring`;

  getRecommendationSummary(
    maxRecent: number = 5,
    maxTopEvents: number = 5
  ): Observable<any> {
    const params = new HttpParams()
      .set('maxRecent', String(Math.max(1, Math.min(maxRecent, 50))))
      .set('maxTopEvents', String(Math.max(1, Math.min(maxTopEvents, 50))));

    return this.http.get<any>(
      `${this.apiUrl}/recommendations/summary`,
      { params }
    );
  }
}