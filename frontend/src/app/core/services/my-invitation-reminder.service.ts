import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MyInvitationReminder } from '../models/my-invitation-reminder.model';

@Injectable({
  providedIn: 'root'
})
export class MyInvitationReminderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/me/invitations`;

  getReminderHistory(invitationId: number): Observable<MyInvitationReminder[]> {
    return this.http.get<MyInvitationReminder[]>(
      `${this.apiUrl}/${invitationId}/reminders`
    );
  }
}