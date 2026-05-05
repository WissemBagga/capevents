export interface AiSentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

export interface AiFeedbackTopic {
  topicId: number;
  label: string;
  count: number;
  keywords: string[];
}

export interface AiFeedbackInsightResponse {
  eventId: string;
  eventTitle: string | null;
  feedbackCount: number;
  averageRating: number;
  globalSentiment: string;
  sentimentScore: number;
  sentimentDistribution: AiSentimentDistribution;
  topics: AiFeedbackTopic[];
  keywords: string[];
  strengths: string[];
  improvements: string[];
  summary: string;
  qwenUsed: boolean;
  summarySource: string;
  modelInfo: Record<string, string>;
}