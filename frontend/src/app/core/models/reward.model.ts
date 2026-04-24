export interface RewardCatalogItemResponse {
  code: string;
  title: string;
  description: string;
  pointsCost: number;
  requiresHrAction: boolean;
  affordable: boolean;
}

export interface RewardRedemptionResponse {
  id: number;
  rewardCode: string;
  rewardTitle: string;
  pointsSpent: number;
  status: string;
  hrComment: string | null;
  createdAt: string;
  handledAt: string | null;
  handledByFullName: string | null;
}

export interface MyRewardsResponse {
  currentPoints: number;
  catalog: RewardCatalogItemResponse[];
  history: RewardRedemptionResponse[];
}

export interface RewardAdminRequestResponse {
  id: number;
  employeeFullName: string;
  employeeEmail: string;
  rewardCode: string;
  rewardTitle: string;
  pointsSpent: number;
  status: string;
  hrComment: string | null;
  createdAt: string;
  handledAt: string | null;
  handledByFullName: string | null;
}