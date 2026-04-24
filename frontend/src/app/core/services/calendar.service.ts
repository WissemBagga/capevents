import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CalendarRangeResponse } from '../models/calendar.model';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/calendar`;

  getMyCalendar(from: string, to: string) {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to);

    return this.http.get<CalendarRangeResponse>(`${this.apiUrl}/me`, { params });
  }

  getAdminCalendar(from: string, to: string) {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to);

    return this.http.get<CalendarRangeResponse>(`${this.apiUrl}/admin`, { params });
  }
}