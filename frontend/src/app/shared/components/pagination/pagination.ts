import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.html',
  styleUrl: './pagination.css'
})
export class Pagination {
  @Input() currentPage = 0;
  @Input() pageSize = 9;
  @Input() totalPages = 1;
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

  get visiblePages(): Array<number | 'ellipsis'> {
    const total = Math.max(this.totalPages, 1);
    const current = this.currentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index);
    }

    const pages: Array<number | 'ellipsis'> = [];

    pages.push(0);

    if (current > 3) {
      pages.push('ellipsis');
    }

    const start = Math.max(1, current - 1);
    const end = Math.min(total - 2, current + 1);

    for (let page = start; page <= end; page++) {
      pages.push(page);
    }

    if (current < total - 4) {
      pages.push('ellipsis');
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

  goToPage(page: number | 'ellipsis'): void {
    if (page === 'ellipsis') return;
    if (page === this.currentPage) return;
    if (page < 0 || page >= this.totalPages) return;

    this.pageChange.emit(page);
  }

  trackByPage(index: number, page: number | 'ellipsis'): string {
    return page === 'ellipsis' ? `ellipsis-${index}` : `page-${page}`;
  }
}