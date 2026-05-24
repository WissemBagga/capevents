import { Component, EventEmitter, Input, Output } from '@angular/core';

type PaginationPage = number | 'dots';

@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.html',
  styleUrl: './pagination.css'
})
export class Pagination {
  @Input() currentPage = 0;
  @Input() pageSize = 9;
  @Input() totalPages = 0;
  @Input() totalItems = 0;
  @Input() itemLabel = 'éléments';

  @Output() pageChange = new EventEmitter<number>();

  get hasItems(): boolean {
    return this.totalItems > 0;
  }

  get canGoPrevious(): boolean {
    return this.currentPage > 0;
  }

  get canGoNext(): boolean {
    return this.currentPage + 1 < this.totalPages;
  }

  get displayedItemsEnd(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalItems);
  }

  get visiblePages(): PaginationPage[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: PaginationPage[] = [];

    if (total <= 0) {
      return pages;
    }

    if (total <= 6) {
      for (let page = 0; page < total; page++) {
        pages.push(page);
      }

      return pages;
    }

    pages.push(0);

    let start = Math.max(1, current - 1);
    let end = Math.min(total - 2, current + 1);

    if (current <= 2) {
      start = 1;
      end = 4;
    }

    if (current >= total - 3) {
      start = total - 5;
      end = total - 2;
    }

    if (start > 1) {
      pages.push('dots');
    }

    for (let page = start; page <= end; page++) {
      pages.push(page);
    }

    if (end < total - 2) {
      pages.push('dots');
    }

    pages.push(total - 1);

    return pages;
  }

  previousPage(): void {
    if (!this.canGoPrevious) return;
    this.pageChange.emit(this.currentPage - 1);
  }

  nextPage(): void {
    if (!this.canGoNext) return;
    this.pageChange.emit(this.currentPage + 1);
  }

  goToPage(page: PaginationPage): void {
    if (page === 'dots') return;
    if (page < 0 || page >= this.totalPages || page === this.currentPage) return;

    this.pageChange.emit(page);
  }

  trackByPage(index: number, page: PaginationPage): string {
    return page === 'dots' ? `dots-${index}` : `page-${page}`;
  }
}