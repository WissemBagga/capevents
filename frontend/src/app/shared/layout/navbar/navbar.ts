import { ChangeDetectorRef, Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AsyncPipe, DatePipe } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationResponse } from '../../../core/models/notification.model';
import { HtmlParser } from '@angular/compiler';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, AsyncPipe, DatePipe, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef)
  private notificationService = inject(NotificationService)

  currentUser$ = this.authService.currentUser$;

  notifications: NotificationResponse[] = [];
  unreadCount =0;

  notificationsOpen = false;
  notificationsLoading = false;
  notificationsErrorMessage = '';
  markAllLoading = false;


  ngOnInit(): void{
    if (this.authService.isLoggedIn()){
      this.loadUnreadCount();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void{
    const target = event.target as HTMLElement | null;

    if (target?.closest('.notification-wrapper')){
      return;
    }
    if (this.notificationsOpen){
      this.notificationsOpen = false;
      this.cdr.markForCheck();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
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

  toggleNotifications(event: MouseEvent): void{
    event.stopPropagation();

    this.notificationsOpen != this.notificationsOpen;
    this.notificationsErrorMessage = '';

    if (this.notificationsOpen){
      this.refreshNotifications();
    }

    this.cdr.markForCheck();
  }

  refreshNotifications(): void{
    this.loadUnreadCount();
    this.loadNotifications();
  }

  private loadUnreadCount(): void{
    this.notificationService.getUnreadCount().subscribe({
      next: (response)=>{
          this.unreadCount = response.unreadCount ?? 0;
          this.cdr.markForCheck();
      },
      error: () => {
        this.unreadCount = 0;
        this.cdr.markForCheck();
      }
    });
  }

  private loadNotifications(): void{
    this.notificationsLoading = false;
    this.notificationsErrorMessage = '';
    this.cdr.markForCheck();

    this.notificationService.getMyNotifications(10).
      pipe(finalize(()=>{
        this.notificationsLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next:(items) => {
          this.notifications = items ?? [];
          this.cdr.markForCheck();
        },
        error: (err)=>{
          this.notifications = [];
          this.notificationsErrorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger les notifications.';
          this.cdr.markForCheck();  
        }
      });
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
          this.notifications = this.notifications.map(item => ({
            ...item,
            read: true,
            readAt: item.readAt ?? new Date().toISOString()
          }));
          this.unreadCount = 0;
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
}