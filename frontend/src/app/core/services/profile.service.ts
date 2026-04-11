import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MyProfileResponse, UpdateMyProfileRequest } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/users/me/profile`;

  getMyProfile() {
    return this.http.get<MyProfileResponse>(this.apiUrl);
  }

  updateMyProfile(payload: UpdateMyProfileRequest) {
    return this.http.put<MyProfileResponse>(this.apiUrl, payload);
  }
}