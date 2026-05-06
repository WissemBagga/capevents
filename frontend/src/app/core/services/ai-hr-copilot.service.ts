import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AiHrCopilotResponse,
  AiHrCopilotSuggestion
} from '../models/ai-hr-copilot.model';

@Injectable({
  providedIn: 'root'
})
export class AiHrCopilotService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/ai/hr-copilot`;

  getSuggestions(): Observable<AiHrCopilotResponse> {
    return this.http
      .get<any>(`${this.apiUrl}/suggestions`)
      .pipe(
        map((response) => this.normalizeResponse(response)),
        catchError(() =>
          of({
            requestId: '',
            generatedAt: '',
            suggestions: [],
            qwenUsed: false,
            summarySource: 'angular_error_fallback'
          })
        )
      );
  }

  private normalizeResponse(response: any): AiHrCopilotResponse {
    const rawSuggestions = Array.isArray(response?.suggestions)
      ? response.suggestions
      : [];

    return {
      requestId: response?.requestId ?? response?.request_id ?? '',
      generatedAt: response?.generatedAt ?? response?.generated_at ?? '',
      suggestions: rawSuggestions.map((item: any): AiHrCopilotSuggestion => ({
        type: item?.type ?? '',
        priority: item?.priority ?? 'LOW',
        title: item?.title ?? '',
        insight: item?.insight ?? '',
        recommendedAction: item?.recommendedAction ?? item?.recommended_action ?? '',
        actionType: item?.actionType ?? item?.action_type ?? null,
        draft: item?.draft ?? null,
        relatedEventId: item?.relatedEventId ?? item?.related_event_id ?? null,
        relatedEventTitle: item?.relatedEventTitle ?? item?.related_event_title ?? null,
        metadata: item?.metadata ?? {}
      })),
      qwenUsed: response?.qwenUsed ?? response?.qwen_used ?? false,
      summarySource: response?.summarySource ?? response?.summary_source ?? ''
    };
  }
}