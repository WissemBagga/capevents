import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  MyRewardsResponse,
  RewardRedemptionResponse,
  RewardAdminRequestResponse
} from '../models/reward.model';

@Injectable({
  providedIn: 'root'
})
export class RewardService {
  private http = inject(HttpClient);
  private readonly userApiUrl = `${environment.apiBaseUrl}/api/me/rewards`;
  private readonly adminApiUrl = `${environment.apiBaseUrl}/api/admin/rewards`;

  getMyRewards() {
    return this.http.get<MyRewardsResponse>(this.userApiUrl);
  }

  redeemReward(rewardCode: string) {
    return this.http.post<RewardRedemptionResponse>(`${this.userApiUrl}/redeem`, { rewardCode });
  }

  getAdminRequests(status = 'ALL') {
    const params = new HttpParams().set('status', status);
    return this.http.get<RewardAdminRequestResponse[]>(this.adminApiUrl, { params });
  }

  completeRequest(id: number) {
    return this.http.post<RewardRedemptionResponse>(`${this.adminApiUrl}/${id}/complete`, {});
  }

  rejectRequest(id: number, reason: string) {
    return this.http.post<RewardRedemptionResponse>(`${this.adminApiUrl}/${id}/reject`, { reason });
  }
}