export interface AiCopilotSuggestionTypeSummary {
  type: string;
  count: number;
}

export interface AiCopilotRecentCall {
  requestId: string;
  createdAt: string;
  suggestionsCount: number;
  suggestionTypes: string[];
  relatedEventIds: string[];
  qwenUsed: boolean;
  summarySource: string;
  status: string;
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

  topSuggestionTypes: AiCopilotSuggestionTypeSummary[];
  recentCalls: AiCopilotRecentCall[];
}