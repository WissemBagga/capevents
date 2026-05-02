export interface AiTopRecommendedEvent {
  eventId: string;
  title: string | null;
  category: string | null;
  count: number;
}

export interface AiRecentPrediction {
  requestId: string;
  createdAt: string;
  userId: string;
  status: string;
  modelName: string;
  modelVersion: string;
  totalCandidates: number;
  recommendationsCount: number;
}

export interface AiRecommendationMonitoringSummary {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalRecommendations: number;
  lastModelName: string | null;
  lastModelVersion: string | null;
  topRecommendedEvents: AiTopRecommendedEvent[];
  recentPredictions: AiRecentPrediction[];
}