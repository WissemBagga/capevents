import { Component, inject } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  private authService = inject(AuthService);
  private router = inject(Router);

  avatarLoadError = false;

  mainOpen = true;
  workOpen = false;
  participationOpen = false;

  assistantsOpen = false;


  ngOnInit(): void {
    this.syncSectionsWithRoute(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.syncSectionsWithRoute(event.urlAfterRedirects);
      });
  }

  get currentUser() {
    return this.authService.getCurrentUserSnapshot();
  }

  get displayName(): string {
    const firstName = this.currentUser?.firstName ?? '';
    const lastName = this.currentUser?.lastName ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'Utilisateur';
  }

  get avatarInitials(): string {
    const first = this.currentUser?.firstName?.charAt(0)?.toUpperCase() ?? '';
    const last = this.currentUser?.lastName?.charAt(0)?.toUpperCase() ?? '';

    if (!first && !last) return 'U';
    return `${first}${last}`.trim();
  }

  get avatarUrl(): string | null {
    const url = this.currentUser?.avatarUrl?.trim();
    return url ? url : null;
  }

  get hasAvatar(): boolean {
    return !!this.avatarUrl && !this.avatarLoadError;
  }

  onAvatarError(): void {
    this.avatarLoadError = true;
  }

  get roleLabel(): string {
    if (this.authService.isHr()) return 'Administrateur RH';
    if (this.authService.isManager()) return 'Manager';
    return 'Employé';
  }

  get homeRoute(): string {
    if (this.authService.isHr()) return '/admin/hr/stats';
    if (this.authService.isManager()) return '/admin/manager/stats';
    return '/dashboard/employee';
  }

  get hasParticipationAccess(): boolean {
    return this.authService.hasEmployeeRole()
      || this.authService.isHr()
      || this.authService.isManager();
  }

  get mainLinks(): NavItem[] {
    if (this.authService.isHr()) {
      return [
        { label: 'Gestion des événements', route: '/admin/hr' },
        { label: 'Événements', route: '/events' },
        { label: 'Statistiques', route: '/admin/hr/stats' }
      ];
    }

    if (this.authService.isManager()) {
      return [
        { label: 'Gestion des événements', route: '/admin/manager' },
        { label: 'Événements', route: '/events' },
        { label: 'Statistiques', route: '/admin/manager/stats' }
      ];
    }

    return [
      { label: 'Tableau de bord', route: '/dashboard/employee' },
      { label: 'Événements', route: '/events' }
    ];
  }


  get assistantLinks(): NavItem[] {
    if (this.authService.isHr()) {
      return [
        { label: 'Assistant RH', route: '/admin/assistants', queryParams: { tab: 'hr-assistant' } },
        { label: 'Planning intelligent', route: '/admin/assistants', queryParams: { tab: 'planning' } }
      ];
    }

    if (this.authService.isManager()) {
      return [
        { label: 'Planning intelligent', route: '/admin/assistants', queryParams: { tab: 'planning' } }
      ];
    }

    return [];
  }

  get participationLinks(): NavItem[] {
    if (!this.hasParticipationAccess) {
      return [];
    }

    return [
      { label: 'Mes événements', route: '/my-events' },
      { label: 'Mes invitations', route: '/my-invitations' },
      { label: 'Événements passés', route: '/events/past' },
      { label: 'Gamification', route: '/gamification' }
    ];
  }

  toggle(section: 'main' | 'work' | 'assistants' | 'participation'): void {
    if (section === 'main') this.mainOpen = !this.mainOpen;
    if (section === 'work') this.workOpen = !this.workOpen;
    if (section === 'assistants') this.assistantsOpen = !this.assistantsOpen;
    if (section === 'participation') this.participationOpen = !this.participationOpen;
  }

  goToCalendar(): void {
    this.router.navigate(['/calendar']);
  }

  get workLinks(): NavItem[] {
    if (this.authService.isHr()) {
      return [
        { label: 'Créer un événement', route: '/admin/create-event' },
        { label: 'Demandes en attente', route: '/admin/pending-events' },
        { label: 'Demandes récompenses', route: '/admin/reward-requests' }
      ];
    }

    if (this.authService.isManager()) {
      return [
        { label: 'Créer un événement', route: '/admin/create-event' },
        { label: 'Demandes en attente', route: '/admin/pending-events' }
      ];
    }

    return [
      { label: 'Proposer un événement', route: '/employee/submit-event' },
      { label: 'Mes demandes', route: '/my-submissions' }
    ];
  }


  goToProfile(): void {
    this.router.navigate(['/my-profile']);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/login']);
      }
    });
  }

  private syncSectionsWithRoute(url: string): void {
    this.mainOpen = this.matchesAny(url, this.mainLinks);
    this.workOpen = this.matchesAny(url, this.workLinks) || this.workOpen;
    this.assistantsOpen = this.matchesAny(url, this.assistantLinks) || this.assistantsOpen;
    this.participationOpen = this.matchesAny(url, this.participationLinks) || this.participationOpen;

    if (!this.mainOpen && !this.workOpen && !this.assistantsOpen && !this.participationOpen) {
      this.mainOpen = true;
    }
  }

  private matchesAny(url: string, items: NavItem[]): boolean {
    return items.some(item => this.routeMatches(url, item.route));
  }


  get userSubtitle(): string {
    const jobTitle = this.currentUser?.jobTitle?.trim();
    return jobTitle || this.roleLabel;
  }

  isLinkActive(route: string, queryParams?: Record<string, string>): boolean {
    const currentUrl = this.router.url;
    const url = currentUrl.split('?')[0];

    let matches = false;
    if (route === '/events') {
      matches = (
        url === '/events' ||
        (url.startsWith('/events/') &&
          !url.startsWith('/events/past') &&
          !url.startsWith('/events/past/'))
      );
    } else if (route === '/admin/hr') {
      matches = url === '/admin/hr';
    } else if (route === '/admin/manager') {
      matches = url === '/admin/manager';
    } else {
      matches = url === route || url.startsWith(route + '/');
    }

    if (!matches) return false;

    if (queryParams) {
      const urlTree = this.router.parseUrl(currentUrl);
      return Object.keys(queryParams).every(
        key => urlTree.queryParams[key] === queryParams[key]
      );
    }

    return true;
  }

  private routeMatches(currentUrl: string, itemRoute: string): boolean {
    if (itemRoute === '/events') {
      return (
        currentUrl === '/events' ||
        (currentUrl.startsWith('/events/') &&
          !currentUrl.startsWith('/events/past') &&
          !currentUrl.startsWith('/events/past/'))
      );
    }

    if (itemRoute === '/admin/hr') {
      return currentUrl === '/admin/hr';
    }

    if (itemRoute === '/admin/manager') {
      return currentUrl === '/admin/manager';
    }

    return currentUrl === itemRoute || currentUrl.startsWith(itemRoute + '/');
  }
}