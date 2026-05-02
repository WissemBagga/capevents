import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AiRecommendationMonitoringSummary,
  AiRecentPrediction,
  AiTopRecommendedEvent
} from '../models/ai-monitoring.model';

@Injectable({
  providedIn: 'root'
})
export class AiMonitoringService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/ai/monitoring`;

  getRecommendationSummary(
    maxRecent: number = 5,
    maxTopEvents: number = 5
  ): Observable<AiRecommendationMonitoringSummary> {
    const params = new HttpParams()
      .set('maxRecent', Math.max(1, Math.min(maxRecent, 50)))
      .set('maxTopEvents', Math.max(1, Math.min(maxTopEvents, 50)));

    return this.http
      .get<any>(`${this.apiUrl}/recommendations/summary`, { params })
      .pipe(
        map((response) => this.normalizeResponse(response)),
        catchError(() =>
          of({
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            totalRecommendations: 0,
            lastModelName: null,
            lastModelVersion: null,
            topRecommendedEvents: [],
            recentPredictions: []
          })
        )
      );
  }

  private normalizeResponse(response: any): AiRecommendationMonitoringSummary {
    const topRecommendedEvents = Array.isArray(response?.topRecommendedEvents)
      ? response.topRecommendedEvents
      : response?.top_recommended_events ?? [];

    const recentPredictions = Array.isArray(response?.recentPredictions)
      ? response.recentPredictions
      : response?.recent_predictions ?? [];

    return {
      totalCalls: response?.totalCalls ?? response?.total_calls ?? 0,
      successfulCalls: response?.successfulCalls ?? response?.successful_calls ?? 0,
      failedCalls: response?.failedCalls ?? response?.failed_calls ?? 0,
      totalRecommendations: response?.totalRecommendations ?? response?.total_recommendations ?? 0,
      lastModelName: response?.lastModelName ?? response?.last_model_name ?? null,
      lastModelVersion: response?.lastModelVersion ?? response?.last_model_version ?? null,
      topRecommendedEvents: topRecommendedEvents.map((item: any): AiTopRecommendedEvent => ({
        eventId: item?.eventId ?? item?.event_id ?? '',
        title: item?.title ?? null,
        category: item?.category ?? null,
        count: item?.count ?? 0
      })),
      recentPredictions: recentPredictions.map((item: any): AiRecentPrediction => ({
        requestId: item?.requestId ?? item?.request_id ?? '',
        createdAt: item?.createdAt ?? item?.created_at ?? '',
        userId: item?.userId ?? item?.user_id ?? '',
        status: item?.status ?? '',
        modelName: item?.modelName ?? item?.model_name ?? '',
        modelVersion: item?.modelVersion ?? item?.model_version ?? '',
        totalCandidates: item?.totalCandidates ?? item?.total_candidates ?? 0,
        recommendationsCount: item?.recommendationsCount ?? item?.recommendations_count ?? 0
      }))
    };
  }
}