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

  /** Identifiant de la section accordéon actuellement ouverte. null = toutes fermées. */
  openedSection: string | null = 'main';

  /** true = sidebar en mode compact (icônes seules), false = mode étendu normal */
  isCollapsed = false;

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

  /**
   * Accordéon exclusif : ouvre la section cliquée et ferme toutes les autres.
   * Si la section est déjà ouverte, elle se referme.
   * Si la sidebar est en mode compact, elle s'ouvre automatiquement.
   */
  toggle(section: string): void {
    if (this.isCollapsed) {
      // En mode compact : ouvrir la sidebar et afficher cette section
      this.isCollapsed = false;
      this.openedSection = section;
    } else {
      // En mode étendu : accordéon normal
      this.openedSection = this.openedSection === section ? null : section;
    }
  }

  /** Retourne true si la section donnée est actuellement ouverte. */
  isSectionOpen(section: string): boolean {
    return this.openedSection === section;
  }

  /** Ouvre ou ferme la sidebar en mode compact. */
  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
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
    // Ouvrir uniquement la section qui contient la route active
    if (this.matchesAny(url, this.mainLinks)) {
      this.openedSection = 'main';
    } else if (this.matchesAny(url, this.workLinks)) {
      this.openedSection = 'work';
    } else if (this.matchesAny(url, this.assistantLinks)) {
      this.openedSection = 'assistants';
    } else if (this.matchesAny(url, this.participationLinks)) {
      this.openedSection = 'participation';
    } else if (this.openedSection === null) {
      // Aucune section active trouvée et rien d'ouvert : ouvrir main par défaut
      this.openedSection = 'main';
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