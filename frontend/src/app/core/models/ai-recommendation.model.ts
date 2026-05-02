export interface AiRecommendationItem {
  eventId: string;
  title: string | null;
  category: string | null;
  startAt: string | null;
  rank: number;
  score: number;
  reasons: string[];
}

export interface AiRecommendationResponse {
  userId: string;
  totalCandidates: number;
  items: AiRecommendationItem[];
  message: string | null;
}