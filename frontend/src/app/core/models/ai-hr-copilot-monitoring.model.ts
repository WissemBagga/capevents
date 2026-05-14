export interface AiHrCopilotSuggestionTypeSummary {
  type: string;
  count: number;
}

export interface AiHrCopilotRecentCall {
  requestId: string;
  createdAt: string;
  status: string;
  suggestionsCount: number;
  suggestionTypes: string[];
  relatedEventIds: string[];
  qwenUsed: boolean;
  summarySource: string | null;
  message: string | null;
}

export interface AiHrCopilotMonitoringResponse {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalSuggestions: number;

  qwenUsedCount: number;
  qwenUsageRate: number;

  feedbackCount: number;
  usefulFeedbackCount: number;
  notUsefulFeedbackCount: number;
  usefulnessRate: number;

  topSuggestionTypes: AiHrCopilotSuggestionTypeSummary[];
  recentCalls: AiHrCopilotRecentCall[];
}