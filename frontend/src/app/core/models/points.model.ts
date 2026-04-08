export interface PointTransactionResponse {
  id: number;
  type: string;
  pointsDelta: number;
  reason: string;
  eventId: string;
  eventTitle: string;
  createdAt: string;
}

export interface MyPointsResponse {
  totalPoints: number;
  history: PointTransactionResponse[];
}