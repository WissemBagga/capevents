import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

import { AiRecommendationResponse } from '../models/ai-recommendation.model';

@Injectable({
  providedIn: 'root'
})
export class AiRecommendationService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/ai/recommendations';

  getRecommendationsForUser(
    userId: string,
    limit: number = 6
  ): Observable<AiRecommendationResponse> {
    const safeLimit = Math.max(1, Math.min(limit, 20));

    const params = new HttpParams()
      .set('limit', safeLimit);

    return this.http
      .get<AiRecommendationResponse>(
        `${this.baseUrl}/users/${userId}`,
        { params }
      )
      .pipe(
        catchError(() =>
          of({
            userId,
            totalCandidates: 0,
            items: [],
            message: 'Impossible de charger les recommandations IA.'
          })
        )
      );
  }
}