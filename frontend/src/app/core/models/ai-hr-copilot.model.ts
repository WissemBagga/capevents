export interface AiHrCopilotSuggestion {
  type: string;
  priority: string;
  title: string;
  insight: string;
  recommendedAction: string;
  draft: string | null;
  relatedEventId: string | null;
  relatedEventTitle: string | null;
  metadata: Record<string, unknown>;
}

export interface AiHrCopilotResponse {
  suggestions: AiHrCopilotSuggestion[];
  qwenUsed: boolean;
  summarySource: string;
}