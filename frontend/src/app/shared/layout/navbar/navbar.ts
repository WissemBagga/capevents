import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, AsyncPipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser$ = this.authService.currentUser$;

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
}
