export interface InterestResponse {
  id: number;
  code: string;
  label: string;
}

export interface UpdateMyInterestsRequest {
  interestIds: number[];
}