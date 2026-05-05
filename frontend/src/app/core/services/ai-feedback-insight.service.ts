import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AiFeedbackInsightResponse,
  AiFeedbackTopic
} from '../models/ai-feedback-insight.model';

@Injectable({
  providedIn: 'root'
})
export class AiFeedbackInsightService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/ai/feedback`;

  getEventFeedbackInsights(eventId: string): Observable<AiFeedbackInsightResponse> {
    return this.http
      .get<any>(`${this.apiUrl}/events/${eventId}/insights`)
      .pipe(
        map((response) => this.normalizeResponse(response, eventId)),
        catchError(() =>
          of({
            eventId,
            eventTitle: null,
            feedbackCount: 0,
            averageRating: 0,
            globalSentiment: 'NEUTRAL',
            sentimentScore: 0,
            sentimentDistribution: {
              positive: 0,
              neutral: 0,
              negative: 0
            },
            topics: [],
            keywords: [],
            strengths: [],
            improvements: [],
            summary: 'Impossible de charger l’analyse IA des feedbacks.',
            qwenUsed: false,
            summarySource: 'angular_error_fallback',
            modelInfo: {}
          })
        )
      );
  }

  private normalizeResponse(response: any, fallbackEventId: string): AiFeedbackInsightResponse {
    const rawTopics = Array.isArray(response?.topics) ? response.topics : [];

    return {
      eventId: response?.eventId ?? response?.event_id ?? fallbackEventId,
      eventTitle: response?.eventTitle ?? response?.event_title ?? null,
      feedbackCount: response?.feedbackCount ?? response?.feedback_count ?? 0,
      averageRating: response?.averageRating ?? response?.average_rating ?? 0,
      globalSentiment: response?.globalSentiment ?? response?.global_sentiment ?? 'NEUTRAL',
      sentimentScore: response?.sentimentScore ?? response?.sentiment_score ?? 0,
      sentimentDistribution: {
        positive:
          response?.sentimentDistribution?.positive ??
          response?.sentiment_distribution?.positive ??
          0,
        neutral:
          response?.sentimentDistribution?.neutral ??
          response?.sentiment_distribution?.neutral ??
          0,
        negative:
          response?.sentimentDistribution?.negative ??
          response?.sentiment_distribution?.negative ??
          0
      },
      topics: rawTopics.map((topic: any): AiFeedbackTopic => ({
        topicId: topic?.topicId ?? topic?.topic_id ?? 0,
        label: topic?.label ?? '',
        count: topic?.count ?? 0,
        keywords: Array.isArray(topic?.keywords) ? topic.keywords : []
      })),
      keywords: Array.isArray(response?.keywords) ? response.keywords : [],
      strengths: Array.isArray(response?.strengths) ? response.strengths : [],
      improvements: Array.isArray(response?.improvements) ? response.improvements : [],
      summary: response?.summary ?? '',
      qwenUsed: response?.qwenUsed ?? response?.qwen_used ?? false,
      summarySource: response?.summarySource ?? response?.summary_source ?? '',
      modelInfo: response?.modelInfo ?? response?.model_info ?? {}
    };
  }
}