export interface AiPlanningSuggestionRequest {
  category: string;
  audience?: string;
  locationType?: string;
  targetDepartmentId?: number | null;
  durationMinutes?: number;
  capacity?: number;
  fromDate?: string | null;
  daysHorizon?: number;
  limit?: number;
}

export interface AiPlanningSlotSuggestion {
  rank: number;
  startAt: string;
  endAt: string;
  dayOfWeek: number;
  hour: number;
  score: number;
  confidence: string;
  reasons: string[];
  metrics: Record<string, any>;
}

export interface AiPlanningSuggestionResponse {
  requestId: string;
  generatedAt: string;
  totalCandidates: number;
  items: AiPlanningSlotSuggestion[];
  modelInfo: Record<string, any>;
}

export interface AiPlanningEventProposalRequest {
  referenceDate?: string | null;
  targetDepartmentId?: number | null;
  limit?: number;
  slotLimit?: number;
  daysHorizon?: number;
}

export interface AiPlanningEventProposal {
  rank: number;
  title: string;
  category: string;
  audience: string;
  locationType: string;
  targetDepartmentId: number | null;
  durationMinutes: number;
  capacity: number;
  objective: string;
  rationale: string[];
  suggestedSlots: AiPlanningSlotSuggestion[];
  metrics: Record<string, any>;
}

export interface AiPlanningEventProposalResponse {
  requestId: string;
  generatedAt: string;
  analysisPeriod: Record<string, any>;
  totalProposals: number;
  items: AiPlanningEventProposal[];
  modelInfo: Record<string, any>;
}