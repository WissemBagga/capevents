import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AiRecommendationResponse } from '../models/ai-recommendation.model';

@Injectable({
  providedIn: 'root'
})
export class AiRecommendationService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiBaseUrl}/api/ai/recommendations`;

  getRecommendationsForUser(
    userId: string,
    limit: number = 6
  ): Observable<AiRecommendationResponse> {
    const safeLimit = Math.max(1, Math.min(limit, 20));

    const params = new HttpParams()
      .set('limit', safeLimit);

    return this.http
      .get<any>(`${this.apiUrl}/users/${userId}`, { params })
      .pipe(
        map((response) => this.normalizeResponse(response, userId)),
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

  private normalizeResponse(response: any, fallbackUserId: string): AiRecommendationResponse {
    const items = Array.isArray(response?.items) ? response.items : [];

    return {
      userId: response?.userId ?? response?.user_id ?? fallbackUserId,
      totalCandidates: response?.totalCandidates ?? response?.total_candidates ?? 0,
      message: response?.message ?? null,
      items: items.map((item: any) => ({
        eventId: item?.eventId ?? item?.event_id ?? '',
        title: item?.title ?? null,
        category: item?.category ?? null,
        startAt: item?.startAt ?? item?.start_at ?? null,
        rank: item?.rank ?? 0,
        score: item?.score ?? 0,
        reasons: Array.isArray(item?.reasons) ? item.reasons : []
      }))
    };
  }
}