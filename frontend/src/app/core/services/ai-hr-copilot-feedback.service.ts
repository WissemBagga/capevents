import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AiHrCopilotFeedbackRequest,
  AiHrCopilotFeedbackResponse
} from '../models/ai-hr-copilot-feedback.model';

@Injectable({
  providedIn: 'root'
})
export class AiHrCopilotFeedbackService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/ai/hr-copilot/feedback`;

  submitFeedback(
    payload: AiHrCopilotFeedbackRequest
  ): Observable<AiHrCopilotFeedbackResponse> {
    return this.http.post<AiHrCopilotFeedbackResponse>(
      this.apiUrl,
      payload
    );
  }
}