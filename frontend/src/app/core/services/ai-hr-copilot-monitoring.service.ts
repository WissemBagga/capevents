import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiHrCopilotMonitoringService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/ai/monitoring/hr-copilot`;

  getSummary(limit = 10): Observable<any> {
    const params = new HttpParams().set('limit', String(limit));

    return this.http.get<any>(
      `${this.apiUrl}/summary`,
      { params }
    );
  }
}