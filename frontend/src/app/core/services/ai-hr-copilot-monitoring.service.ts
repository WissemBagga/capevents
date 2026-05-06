import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AiHrCopilotMonitoringResponse,
  AiCopilotRecentCall,
  AiCopilotSuggestionTypeSummary
} from '../models/ai-hr-copilot-monitoring.model';

@Injectable({
  providedIn: 'root'
})
export class AiHrCopilotMonitoringService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/ai/monitoring/hr-copilot`;

  getSummary(limit = 10): Observable<AiHrCopilotMonitoringResponse> {
    const params = new HttpParams().set('limit', limit);

    return this.http
      .get<any>(`${this.apiUrl}/summary`, { params })
      .pipe(
        map((response) => this.normalizeResponse(response)),
        catchError(() =>
          of({
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            totalSuggestions: 0,
            qwenUsedCount: 0,
            qwenUsageRate: 0,
            topSuggestionTypes: [],
            recentCalls: []
          })
        )
      );
  }

  private normalizeResponse(response: any): AiHrCopilotMonitoringResponse {
    const rawTypes = Array.isArray(response?.topSuggestionTypes)
      ? response.topSuggestionTypes
      : response?.top_suggestion_types ?? [];

    const rawCalls = Array.isArray(response?.recentCalls)
      ? response.recentCalls
      : response?.recent_calls ?? [];

    return {
      totalCalls: response?.totalCalls ?? response?.total_calls ?? 0,
      successfulCalls: response?.successfulCalls ?? response?.successful_calls ?? 0,
      failedCalls: response?.failedCalls ?? response?.failed_calls ?? 0,
      totalSuggestions: response?.totalSuggestions ?? response?.total_suggestions ?? 0,
      qwenUsedCount: response?.qwenUsedCount ?? response?.qwen_used_count ?? 0,
      qwenUsageRate: response?.qwenUsageRate ?? response?.qwen_usage_rate ?? 0,

      topSuggestionTypes: rawTypes.map((item: any): AiCopilotSuggestionTypeSummary => ({
        type: item?.type ?? '',
        count: item?.count ?? 0
      })),

      recentCalls: rawCalls.map((item: any): AiCopilotRecentCall => ({
        requestId: item?.requestId ?? item?.request_id ?? '',
        createdAt: item?.createdAt ?? item?.created_at ?? '',
        suggestionsCount: item?.suggestionsCount ?? item?.suggestions_count ?? 0,
        suggestionTypes: item?.suggestionTypes ?? item?.suggestion_types ?? [],
        relatedEventIds: item?.relatedEventIds ?? item?.related_event_ids ?? [],
        qwenUsed: item?.qwenUsed ?? item?.qwen_used ?? false,
        summarySource: item?.summarySource ?? item?.summary_source ?? '',
        status: item?.status ?? 'UNKNOWN',
        message: item?.message ?? null
      }))
    };
  }
}