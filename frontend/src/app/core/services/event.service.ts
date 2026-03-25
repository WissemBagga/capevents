import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/page-response.model';
import { EventResponse } from '../models/event.model';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CreateEventRequest } from '../models/create-event.model';
import {RegistrationResponse} from '../models/registration.model'

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/events`;

  getPublished(page = 0, size = 10, sortBy = 'startAt', sortDir = 'asc'): Observable<PageResponse<EventResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<PageResponse<EventResponse>>(`${this.apiUrl}/published`, { params });
  }

  searchPublished(
    category: string | null,
    from: string | null,
    to: string | null,
    page = 0,
    size = 10,
    sortBy = 'startAt',
    sortDir = 'asc'
  ): Observable<PageResponse<EventResponse>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    if (category) params = params.set('category', category);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http.get<PageResponse<EventResponse>>(`${this.apiUrl}/published/search`, { params });
  }

  getPublishedById(id: string): Observable<EventResponse> {
    return this.http.get<EventResponse>(`${this.apiUrl}/published/${id}`);
  }

  getDepartmentAdminEvents(): Observable<EventResponse[]> {
    return this.http.get<EventResponse[]>(`${this.apiUrl}/admin/department`);
  }

  publishEvent(id: string) {
    return this.http.post<EventResponse>(`${this.apiUrl}/${id}/publish`, {});
  }

  cancelEvent(id: string, reason: string) {
    return this.http.post<EventResponse>(`${this.apiUrl}/${id}/cancel`, { reason });
  }

  archiveEvent(id: string) {
    return this.http.post<EventResponse>(`${this.apiUrl}/${id}/archive`, {});
  }


  createEvent(payload: CreateEventRequest) {
    return this.http.post<EventResponse>(`${this.apiUrl}`, payload);
  }

  getHrAdminEvents(page = 0, size = 10, sortBy = 'createdAt', sortDir = 'desc') {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<PageResponse<EventResponse>>(`${this.apiUrl}/admin`, { params });
  }

  getAdminById(id: string) {
    return this.http.get<EventResponse>(`${this.apiUrl}/admin/${id}`);
  }

  updateEvent(id: string, payload: CreateEventRequest) {
    return this.http.put<EventResponse>(`${this.apiUrl}/${id}`, payload);
  }


  
  registerToEvent(id: string) {
    return this.http.post<RegistrationResponse>(`${this.apiUrl}/${id}/register`, {});
  }

  unregisterFromEvent(id: string) {
    return this.http.post<RegistrationResponse>(`${this.apiUrl}/${id}/unregister`, {});
  }

  getRegistrationStatus(id: string) {
    return this.http.get<boolean>(`${this.apiUrl}/${id}/registration-status`);
  }

  getMyRegistrations() {
    return this.http.get<RegistrationResponse[]>(`${environment.apiBaseUrl}/api/me/registrations`);
  }

}