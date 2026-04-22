import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.css'
})
export class Forbidden {
  private router = inject(Router);
  private location = inject(Location);
  private authService = inject(AuthService);

  get homeRoute(): string {
    if (this.authService.isHr()) return '/admin/hr/stats';
    if (this.authService.isManager()) return '/admin/manager/stats';
    return '/dashboard/employee';
  }

  goBackOrHome(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate([this.homeRoute]);
  }
}