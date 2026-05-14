import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

type AssistantTab = 'hr-assistant' | 'planning';

@Component({
  selector: 'app-ai-assistants-hub',
  standalone: true,
  templateUrl: './ai-assistants-hub.html',
  styleUrl: './ai-assistants-hub.css'
})
export class AiAssistantsHub {
  private authService = inject(AuthService);
  private router = inject(Router);

  activeTab: AssistantTab = this.authService.isHr() ? 'hr-assistant' : 'planning';

  get tabs(): { key: AssistantTab; label: string }[] {
    if (this.authService.isHr()) {
      return [
        { key: 'hr-assistant', label: 'Assistant RH' },
        { key: 'planning', label: 'Planning intelligent' }
      ];
    }

    return [
      { key: 'planning', label: 'Planning intelligent' }
    ];
  }

  get dashboardRoute(): string {
    return this.authService.isHr() ? '/admin/hr' : '/admin/manager';
  }

  selectTab(tab: AssistantTab): void {
    this.activeTab = tab;
  }

  openAssistant(): void {
    this.router.navigate([this.dashboardRoute], {
      queryParams: { panel: 'assistant-rh' }
    });
  }

  openPlanning(): void {
    this.router.navigate([this.dashboardRoute], {
      queryParams: { panel: 'planning' }
    });
  }
}