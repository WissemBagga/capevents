import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { RewardService } from '../../../core/services/reward.service';
import { RewardAdminRequestResponse } from '../../../core/models/reward.model';
import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

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

  canProcess(item: RewardAdminRequestResponse): boolean {
    return item.status === 'PENDING_HR_ACTION' && this.processingId !== item.id;
  }

  trackById(_: number, item: RewardAdminRequestResponse): number {
    return item.id;
  }
}