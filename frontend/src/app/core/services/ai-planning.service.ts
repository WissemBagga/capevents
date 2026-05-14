import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AiPlanningEventProposalRequest,
  AiPlanningEventProposalResponse,
  AiPlanningSuggestionRequest,
  AiPlanningSuggestionResponse,
  AiPlanningMonitoringSummary,
  AiPlanningUsageRequest,
  AiPlanningUsageResponse
} from '../models/ai-planning.model';

@Injectable({
  providedIn: 'root'
})
export class AiPlanningService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/ai/planning`;

  suggestSlots(payload: AiPlanningSuggestionRequest): Observable<AiPlanningSuggestionResponse> {
    return this.http
      .post<any>(`${this.apiUrl}/suggestions`, this.toSuggestionApiPayload(payload))
      .pipe(map(response => this.normalizeSuggestionResponse(response)));
  }

  proposeEvents(payload: AiPlanningEventProposalRequest): Observable<AiPlanningEventProposalResponse> {
    return this.http
      .post<any>(`${this.apiUrl}/event-proposals`, this.toProposalApiPayload(payload))
      .pipe(map(response => this.normalizeProposalResponse(response)));
  }

  getMonitoringSummary(
    days = 30,
    targetDepartmentId: number | null = null
  ): Observable<any> {
    const params: Record<string, string> = {
      days: String(days)
    };

    if (targetDepartmentId !== null) {
      params['targetDepartmentId'] = String(targetDepartmentId);
    }

    return this.http.get<any>(
      `${this.apiUrl}/monitoring/summary`,
      { params }
    );
  }

  logUsage(payload: AiPlanningUsageRequest): Observable<AiPlanningUsageResponse> {
    return this.http
      .post<any>(`${this.apiUrl}/usage`, {
        request_id: payload.requestId ?? null,
        action: payload.action,
        proposal_rank: payload.proposalRank ?? null,
        proposal_title: payload.proposalTitle ?? null,
        category: payload.category ?? null,
        target_department_id: payload.targetDepartmentId ?? null,
        selected_slot_start_at: payload.selectedSlotStartAt ?? null,
        selected_slot_score: payload.selectedSlotScore ?? null,
        created_event_id: payload.createdEventId ?? null,
        created_event_status: payload.createdEventStatus ?? null,
        source: payload.source ?? 'angular_admin_dashboard'
      })
      .pipe(map(response => ({
        status: response?.status ?? '',
        loggedAt: response?.loggedAt ?? response?.logged_at ?? ''
      })));
  }

  private toSuggestionApiPayload(payload: AiPlanningSuggestionRequest): any {
    return {
      category: payload.category,
      audience: payload.audience ?? 'GLOBAL',
      location_type: payload.locationType ?? 'ONSITE',
      target_department_id: payload.targetDepartmentId ?? null,
      duration_minutes: payload.durationMinutes ?? 60,
      capacity: payload.capacity ?? 30,
      from_date: payload.fromDate ?? null,
      days_horizon: payload.daysHorizon ?? 30,
      limit: payload.limit ?? 5
    };
  }

  private toProposalApiPayload(payload: AiPlanningEventProposalRequest): any {
    return {
      reference_date: payload.referenceDate
        ? new Date(payload.referenceDate).toISOString()
        : null,
      target_department_id: payload.targetDepartmentId ?? null,
      limit: payload.limit ?? 3,
      slot_limit: payload.slotLimit ?? 3,
      days_horizon: payload.daysHorizon ?? 30
    };
  }

  private normalizeSuggestionResponse(response: any): AiPlanningSuggestionResponse {
    const rawItems = response?.items ?? [];

    return {
      requestId: response?.requestId ?? response?.request_id ?? '',
      generatedAt: response?.generatedAt ?? response?.generated_at ?? '',
      totalCandidates: response?.totalCandidates ?? response?.total_candidates ?? 0,
      modelInfo: response?.modelInfo ?? response?.model_info ?? {},
      items: rawItems.map((item: any) => ({
        rank: item?.rank ?? 0,
        startAt: item?.startAt ?? item?.start_at ?? '',
        endAt: item?.endAt ?? item?.end_at ?? '',
        dayOfWeek: item?.dayOfWeek ?? item?.day_of_week ?? 0,
        hour: item?.hour ?? 0,
        score: item?.score ?? 0,
        confidence: item?.confidence ?? '',
        reasons: item?.reasons ?? [],
        metrics: item?.metrics ?? {}
      }))
    };
  }

  private normalizeProposalResponse(response: any): AiPlanningEventProposalResponse {
    const rawItems = response?.items ?? [];

    return {
      requestId: response?.requestId ?? response?.request_id ?? '',
      generatedAt: response?.generatedAt ?? response?.generated_at ?? '',
      analysisPeriod: response?.analysisPeriod ?? response?.analysis_period ?? {},
      totalProposals: response?.totalProposals ?? response?.total_proposals ?? 0,
      modelInfo: response?.modelInfo ?? response?.model_info ?? {},
      items: rawItems.map((item: any) => ({
        rank: item?.rank ?? 0,
        title: item?.title ?? '',
        category: item?.category ?? '',
        audience: item?.audience ?? '',
        locationType: item?.locationType ?? item?.location_type ?? '',
        targetDepartmentId: item?.targetDepartmentId ?? item?.target_department_id ?? null,
        durationMinutes: item?.durationMinutes ?? item?.duration_minutes ?? 60,
        capacity: item?.capacity ?? 30,
        objective: item?.objective ?? '',
        rationale: item?.rationale ?? [],
        suggestedSlots: (item?.suggestedSlots ?? item?.suggested_slots ?? []).map((slot: any) => ({
          rank: slot?.rank ?? 0,
          startAt: slot?.startAt ?? slot?.start_at ?? '',
          endAt: slot?.endAt ?? slot?.end_at ?? '',
          dayOfWeek: slot?.dayOfWeek ?? slot?.day_of_week ?? 0,
          hour: slot?.hour ?? 0,
          score: slot?.score ?? 0,
          confidence: slot?.confidence ?? '',
          reasons: slot?.reasons ?? [],
          metrics: slot?.metrics ?? {}
        })),
        metrics: item?.metrics ?? {}
      }))
    };
  }
}