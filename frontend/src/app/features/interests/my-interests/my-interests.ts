import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { InterestService } from '../../../core/services/interest.service';
import { InterestResponse } from '../../../core/models/interest.model';

import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';


@Component({
  selector: 'app-my-interests',
  standalone: true,
  imports: [RouterLink, ScrollToMessageDirective],
  templateUrl: './my-interests.html',
  styleUrl: './my-interests.css'
})
export class MyInterests {
  private interestService = inject(InterestService);
  private cdr = inject(ChangeDetectorRef);

  availableInterests: InterestResponse[] = [];
  selectedIds: number[] = [];

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  readonly maxSelection = 6;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    forkJoin({
      available: this.interestService.getAllInterests(),
      mine: this.interestService.getMyInterests()
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: ({ available, mine }) => {
          this.availableInterests = available ?? [];
          this.selectedIds = (mine ?? []).map(item => item.id);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.availableInterests = [];
          this.selectedIds = [];
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger vos intérêts.';
          this.cdr.markForCheck();
        }
      });
  }

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  toggleInterest(id: number): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isSelected(id)) {
      this.selectedIds = this.selectedIds.filter(item => item !== id);
      this.cdr.markForCheck();
      return;
    }

    if (this.selectedIds.length >= this.maxSelection) {
      this.errorMessage = `Vous pouvez sélectionner au maximum ${this.maxSelection} intérêts.`;
      this.cdr.markForCheck();
      return;
    }

    this.selectedIds = [...this.selectedIds, id];
    this.cdr.markForCheck();
  }

  save(): void {
    if (this.selectedIds.length === 0) {
      this.errorMessage = 'Veuillez sélectionner au moins un intérêt.';
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.interestService.updateMyInterests({ interestIds: this.selectedIds })
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (saved) => {
          this.selectedIds = (saved ?? []).map(item => item.id);
          this.successMessage = 'Vos intérêts ont été enregistrés.';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible d’enregistrer vos intérêts.';
          this.cdr.markForCheck();
        }
      });
  }

  trackByInterestId(_: number, item: InterestResponse): number {
    return item.id;
  }
}