export interface AiHrCopilotFeedbackRequest {
  requestId: string;
  suggestionType: string;
  relatedEventId: string | null;
  useful: boolean;
  comment?: string | null;
}

export interface AiHrCopilotFeedbackResponse {
  status: string;
  message: string;
}