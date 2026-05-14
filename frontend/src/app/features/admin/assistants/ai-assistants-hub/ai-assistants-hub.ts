import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  private route = inject(ActivatedRoute);

  activeTab: AssistantTab = this.defaultTab;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const requestedTab = params.get('tab');

      if (this.canAccessTab(requestedTab)) {
        this.activeTab = requestedTab;
        return;
      }

      this.activeTab = this.defaultTab;
      this.updateUrl(this.defaultTab, true);
    });
  }

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

  get defaultTab(): AssistantTab {
    return this.authService.isHr() ? 'hr-assistant' : 'planning';
  }

  get dashboardRoute(): string {
    return this.authService.isHr() ? '/admin/hr' : '/admin/manager';
  }

  selectTab(tab: AssistantTab): void {
    if (!this.canAccessTab(tab)) return;

    this.activeTab = tab;
    this.updateUrl(tab);
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

  get activeDescription(): string {
    switch (this.activeTab) {
      case 'hr-assistant':
        return 'Analyse les événements, invitations et signaux RH pour proposer des actions intelligentes.';
      case 'planning':
        return 'Génère des propositions d’événements et recommande les meilleurs créneaux.';
      default:
        return 'Accédez aux assistants intelligents disponibles selon votre rôle.';
    }
  }

  private updateUrl(tab: AssistantTab, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl
    });
  }

  private canAccessTab(value: string | null): value is AssistantTab {
    if (value === 'planning') {
      return true;
    }

    if (value === 'hr-assistant') {
      return this.authService.isHr();
    }

    return false;
  }
}