import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InvitationReminderResponse } from '../models/invitation-reminder.model';
import { InvitationReminderHistoryResponse } from '../models/invitation-reminder-history.model';

@Injectable({
  providedIn: 'root'
})
export class InvitationReminderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/admin/events`;

  sendPendingInvitationReminders(
    eventId: string,
    message?: string | null
    ): Observable<InvitationReminderResponse> {
    return this.http.post<InvitationReminderResponse>(
        `${this.apiUrl}/${eventId}/invitations/reminders`,
        {
        message: message?.trim() || null
        }
    );
  }

  getReminderHistory(eventId: string) {
    return this.http.get<InvitationReminderHistoryResponse[]>(
        `${this.apiUrl}/${eventId}/invitations/reminders`
    );
    }
}