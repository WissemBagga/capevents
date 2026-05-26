import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { RewardService } from '@core/services/reward.service';
import { RewardAdminRequestResponse } from '@core/models/reward.model';
import { ScrollToMessageDirective } from '../../../../shared/directives/scroll-to-message.directive';

@Component({
  selector: 'app-admin-reward-requests',
  standalone: true,
  imports: [DatePipe, FormsModule, ScrollToMessageDirective],
  templateUrl: './admin-reward-requests.html',
  styleUrl: './admin-reward-requests.css'
})
export class AdminRewardRequests {
  private rewardService = inject(RewardService);
  private cdr = inject(ChangeDetectorRef);

  requests: RewardAdminRequestResponse[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  statusFilter = 'ALL';
  processingId: number | null = null;

  rejectReasonById: Record<number, string> = {};
  showRejectBoxById: Record<number, boolean> = {};

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.rewardService.getAdminRequests(this.statusFilter)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (items) => {
          this.requests = items ?? [];
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.requests = [];
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger les demandes de récompenses.';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilter(): void {
    this.loadRequests();
  }

  complete(item: RewardAdminRequestResponse): void {
    if (!this.canProcess(item)) return;

    this.processingId = item.id;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.rewardService.completeRequest(item.id)
      .pipe(finalize(() => {
        this.processingId = null;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.successMessage = `La demande "${item.rewardTitle}" a été confirmée.`;
          this.loadRequests();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de confirmer cette demande.';
          this.cdr.markForCheck();
        }
      });
  }

  toggleRejectBox(id: number): void {
    this.showRejectBoxById[id] = !this.showRejectBoxById[id];

    if (!this.showRejectBoxById[id]) {
      this.rejectReasonById[id] = '';
    }

    this.cdr.markForCheck();
  }

  reject(item: RewardAdminRequestResponse): void {
    const reason = this.rejectReasonById[item.id]?.trim();

    if (!reason) {
      this.errorMessage = 'Le motif du refus est obligatoire.';
      this.cdr.markForCheck();
      return;
    }

    this.processingId = item.id;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.rewardService.rejectRequest(item.id, reason)
      .pipe(finalize(() => {
        this.processingId = null;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.successMessage = `La demande "${item.rewardTitle}" a été refusée et les points ont été remboursés.`;
          this.rejectReasonById[item.id] = '';
          this.showRejectBoxById[item.id] = false;
          this.loadRequests();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de refuser cette demande.';
          this.cdr.markForCheck();
        }
      });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING_HR_ACTION: 'En attente RH',
      COMPLETED: 'Confirmée',
      REJECTED: 'Refusée'
    };

    return labels[status] || status;
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING_HR_ACTION: 'status-pending',
      COMPLETED: 'status-completed',
      REJECTED: 'status-rejected'
    };

    return classes[status] || 'status-default';
  }

  canProcess(item: RewardAdminRequestResponse): boolean {
    return item.status === 'PENDING_HR_ACTION' && this.processingId !== item.id;
  }

  isProcessing(item: RewardAdminRequestResponse): boolean {
    return this.processingId === item.id;
  }

  initials(fullName: string | null | undefined): string {
    const parts = (fullName ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) return '??';

    return parts
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  get totalRequests(): number {
    return this.requests.length;
  }

  get pendingCount(): number {
    return this.requests.filter(item => item.status === 'PENDING_HR_ACTION').length;
  }

  get completedCount(): number {
    return this.requests.filter(item => item.status === 'COMPLETED').length;
  }

  get rejectedCount(): number {
    return this.requests.filter(item => item.status === 'REJECTED').length;
  }

  trackById(_: number, item: RewardAdminRequestResponse): number {
    return item.id;
  }
}
