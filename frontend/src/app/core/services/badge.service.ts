import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MyBadgesResponse } from '../models/badge.model';

@Injectable({
  providedIn: 'root'
})
export class BadgeService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/me/badges`;

  getMyBadges() {
    return this.http.get<MyBadgesResponse>(this.apiUrl);
  }
}