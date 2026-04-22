import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
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
        { label: 'Statistiques', route: '/admin/hr/stats' },
        { label: 'Gestion des événements', route: '/admin/hr' },
        { label: 'Événements', route: '/events' },
        { label: 'Départements', route: '/admin/admin-departments' },
        { label: 'Utilisateurs & rôles', route: '/admin/admin-users' }
      ];
    }

    if (this.authService.isManager()) {
      return [
        { label: 'Statistiques', route: '/admin/manager/stats' },
        { label: 'Gestion des événements', route: '/admin/manager' },
        { label: 'Événements', route: '/events' },
      ];
    }

    return [
      { label: 'Tableau de bord', route: '/dashboard/employee' },
      { label: 'Événements', route: '/events' },
    ];
  }

  get workLinks(): NavItem[] {
    if (this.authService.isHr() || this.authService.isManager()) {
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

  get participationLinks(): NavItem[] {
    if (!this.hasParticipationAccess) {
      return [];
    }

    return [
      { label: 'Mes événements', route: '/my-events' },
      { label: 'Mes invitations', route: '/my-invitations' },
      { label: 'Mes points', route: '/my-points' },
      { label: 'Mes intérêts', route: '/my-interests' },
      { label: 'Événements passés', route: '/events/past' }
    ];
  }

  toggle(section: 'main' | 'work' | 'participation'): void {
    if (section === 'main') this.mainOpen = !this.mainOpen;
    if (section === 'work') this.workOpen = !this.workOpen;
    if (section === 'participation') this.participationOpen = !this.participationOpen;
  }

  isEventsLink(route: string): boolean {
    return route === '/events';
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
    this.participationOpen = this.matchesAny(url, this.participationLinks) || this.participationOpen;

    if (!this.mainOpen && !this.workOpen && !this.participationOpen) {
      this.mainOpen = true;
    }
  }

  private matchesAny(url: string, items: NavItem[]): boolean {
    return items.some(item => this.routeMatches(url, item.route));
  }

  private routeMatches(currentUrl: string, itemRoute: string): boolean {
    if (itemRoute === '/events') {
      return currentUrl.startsWith('/events');
    }

    return currentUrl === itemRoute || currentUrl.startsWith(itemRoute + '/');
  }

  get userSubtitle(): string {
    const jobTitle = this.currentUser?.jobTitle?.trim();
    return jobTitle || this.roleLabel;
  }
}
