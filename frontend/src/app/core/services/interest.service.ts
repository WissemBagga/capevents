import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { InterestResponse, UpdateMyInterestsRequest } from '../models/interest.model';

@Injectable({
  providedIn: 'root'
})
export class InterestService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api`;

  getAllInterests() {
    return this.http.get<InterestResponse[]>(`${this.apiUrl}/interests`);
  }

  getMyInterests() {
    return this.http.get<InterestResponse[]>(`${this.apiUrl}/me/interests`);
  }

  updateMyInterests(payload: UpdateMyInterestsRequest) {
    return this.http.put<InterestResponse[]>(`${this.apiUrl}/me/interests`, payload);
  }
}