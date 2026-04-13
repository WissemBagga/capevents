import {
  ChangeDetectorRef,
  Component,
  HostListener,
  inject
} from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationResponse } from '../../../core/models/notification.model';

interface NotificationGroup{
  label: string;
  items: NotificationResponse[];
}
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AsyncPipe, DatePipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);

  currentUser$ = this.authService.currentUser$;

  notifications: NotificationResponse[] = [];
  groupedNotifications: NotificationGroup[] = [];
  unreadCount = 0;

  notificationsOpen = false;
  notificationsLoading = false;
  notificationsErrorMessage = '';
  markAllLoading = false;

  private refreshTimer: number | null = null;

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.loadUnreadCount();
      this.startAutoRefresh();
    }
  }

  ngOnDestroy(): void{
    this.stopAutoRefresh();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (target?.closest('.notification-wrapper')) {
      return;
    }

    if (this.notificationsOpen) {
      this.notificationsOpen = false;
      this.cdr.markForCheck();
    }
  }

  logout(): void {
    this.stopAutoRefresh();

    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/login']);
      }
    });
  }

  isHr(): boolean {
    return this.authService.isHr();
  }

  isManager(): boolean {
    return this.authService.isManager();
  }

  hasEmployeeRole(): boolean {
    return this.authService.hasEmployeeRole();
  }

  isAdmin(): boolean {
    return this.isHr() || this.isManager();
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();

    this.notificationsOpen = !this.notificationsOpen;
    this.notificationsErrorMessage = '';

    if (this.notificationsOpen) {
      this.refreshNotifications();
    }

    this.cdr.markForCheck();
  }

  refreshNotifications(): void {
    this.loadUnreadCount();
    this.loadNotifications();
  }

  markAsRead(notification: NotificationResponse, event: MouseEvent): void {
    event.stopPropagation();

    if (notification.read) return;

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.read = true;
        notification.readAt = new Date().toISOString();
        this.unreadCount = Math.max(this.unreadCount - 1, 0);
        this.cdr.markForCheck();
      },
      error: () => {
        this.notificationsErrorMessage = 'Impossible de marquer cette notification comme lue.';
        this.cdr.markForCheck();
      }
    });
  }

  markAllAsRead(event: MouseEvent): void {
    event.stopPropagation();

    if (this.unreadCount === 0) return;

    this.markAllLoading = true;
    this.notificationsErrorMessage = '';
    this.cdr.markForCheck();

    this.notificationService.markAllAsRead()
      .pipe(finalize(() => {
        this.markAllLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          const now = new Date().toISOString(); 
          this.notifications = this.notifications.map(item => ({
            ...item,
            read: true,
            readAt: item.readAt ?? now
          }));
          this.unreadCount = 0;
          this.groupNotificationsByDate();
          this.cdr.markForCheck();
        },
        error: () => {
          this.notificationsErrorMessage = 'Impossible de marquer toutes les notifications comme lues.';
          this.cdr.markForCheck();
        }
      });
  }

  openNotification(notification: NotificationResponse, event: MouseEvent): void {
    event.stopPropagation();

    const navigate = () => {
      if (notification.actionPath) {
        this.notificationsOpen = false;
        this.router.navigateByUrl(notification.actionPath);
      }
    };

    if (notification.read) {
      navigate();
      return;
    }

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.read = true;
        notification.readAt = new Date().toISOString();
        this.unreadCount = Math.max(this.unreadCount - 1, 0);
        this.groupNotificationsByDate();
        this.cdr.markForCheck();
        navigate();
      },
      error: () => {
        navigate();
      }
    });
  }

  trackByNotificationId(_: number, item: NotificationResponse): number {
    return item.id;
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadCount = response.unreadCount ?? 0;
        this.cdr.markForCheck();
      },
      error: () => {
        this.unreadCount = 0;
        this.cdr.markForCheck();
      }
    });
  }

  private loadNotifications(): void {
    this.notificationsLoading = true;
    this.notificationsErrorMessage = '';
    this.cdr.markForCheck();

    this.notificationService.getMyNotifications(10)
      .pipe(finalize(() => {
        this.notificationsLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (items) => {
          this.notifications = items ?? [];
          this.groupNotificationsByDate();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.notifications = [];
          this.groupedNotifications = [];
          this.notificationsErrorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger les notifications.';
          this.cdr.markForCheck();
        }
      });
  }

  private groupNotificationsByDate(): void {
    const groups = new Map<string, NotificationResponse[]>();

    for (const notification of this.notifications) {
      const label = this.getDateLabel(notification.createdAt);
      const existing = groups.get(label) ?? [];
      existing.push(notification);
      groups.set(label, existing);
    }

    this.groupedNotifications = Array.from(groups.entries()).map(([label, items]) => ({
      label,
      items
    }));
  }

  private getDateLabel(dateIso: string): string {
    const date = new Date(dateIso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const normalized = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    if (normalized(date) === normalized(today)) {
      return 'Aujourd’hui';
    }

    if (normalized(date) === normalized(yesterday)) {
      return 'Hier';
    }

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();

    this.refreshTimer = window.setInterval(() => {

      if (this.notificationsOpen) {
        this.loadNotifications();
        this.loadUnreadCount();
      }
    }, 30000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}