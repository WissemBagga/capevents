import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InvitationReminderResponse } from '../models/invitation-reminder.model';

@Injectable({
  providedIn: 'root'
})
export class InvitationReminderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/admin/events`;

  sendPendingInvitationReminders(eventId: string): Observable<InvitationReminderResponse> {
    return this.http.post<InvitationReminderResponse>(
      `${this.apiUrl}/${eventId}/invitations/reminders`,
      {}
    );
  }
}