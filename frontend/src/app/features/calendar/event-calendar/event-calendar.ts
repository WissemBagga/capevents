import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CalendarService } from '../../../core/services/calendar.service';
import { AuthService } from '../../../core/services/auth.service';
import { CalendarDayGroupResponse, CalendarEventItemResponse } from '../../../core/models/calendar.model';
import { ScrollToMessageDirective } from '../../../shared/directives/scroll-to-message.directive';

type CalendarCell = {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEventItemResponse[];
};

@Component({
  selector: 'app-event-calendar',
  standalone: true,
  imports: [DatePipe, NgClass, ScrollToMessageDirective],
  templateUrl: './event-calendar.html',
  styleUrl: './event-calendar.css'
})
export class EventCalendar {
  private calendarService = inject(CalendarService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  errorMessage = '';

  currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  selectedDateKey = this.toDateKey(new Date());

  dayGroups: CalendarDayGroupResponse[] = [];
  calendarCells: CalendarCell[] = [];

  ngOnInit(): void {
    this.loadCalendar();
  }

  get monthLabel(): string {
    return this.currentMonth.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  }

  get selectedDayEvents(): CalendarEventItemResponse[] {
    const found = this.dayGroups.find(day => day.date === this.selectedDateKey);
    return found?.events ?? [];
  }

  get isAdminView(): boolean {
    return this.authService.isHr() || this.authService.isManager();
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.loadCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.loadCalendar();
  }

  selectDay(cell: CalendarCell): void {
    this.selectedDateKey = this.toDateKey(cell.date);
    this.cdr.markForCheck();
  }

  openEvent(event: CalendarEventItemResponse): void {
    if (this.isAdminView) {
      this.router.navigate(['/admin/events', event.eventId]);
      return;
    }

    this.router.navigate(['/events', event.eventId]);
  }

  trackByEventId(_: number, item: CalendarEventItemResponse): string {
    return item.eventId;
  }

  eventBadgeClass(event: CalendarEventItemResponse): string {
    if (event.registered) return 'event-badge registered';
    if (event.adminView) return 'event-badge admin';
    return 'event-badge visible';
  }

  private loadCalendar(): void {
    const { from, to } = this.getMonthRange();
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const request$ = this.isAdminView
      ? this.calendarService.getAdminCalendar(from, to)
      : this.calendarService.getMyCalendar(from, to);

    request$
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.dayGroups = response.days ?? [];
          this.calendarCells = this.buildCalendarCells(this.currentMonth, this.dayGroups);
          this.ensureSelectedDate();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.dayGroups = [];
          this.calendarCells = [];
          this.errorMessage =
            err?.error?.message ||
            err?.error ||
            'Impossible de charger le calendrier.';
          this.cdr.markForCheck();
        }
      });
  }

  private getMonthRange(): { from: string; to: string } {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const calendarStart = new Date(firstDay);
    calendarStart.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));

    const calendarEnd = new Date(lastDay);
    calendarEnd.setDate(lastDay.getDate() + (7 - ((lastDay.getDay() + 6) % 7) - 1));

    return {
      from: this.toDateKey(calendarStart),
      to: this.toDateKey(calendarEnd)
    };
  }

  private buildCalendarCells(monthDate: Date, dayGroups: CalendarDayGroupResponse[]): CalendarCell[] {
    const map = new Map(dayGroups.map(day => [day.date, day.events]));
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));

    const end = new Date(lastDay);
    end.setDate(lastDay.getDate() + (7 - ((lastDay.getDay() + 6) % 7) - 1));

    const todayKey = this.toDateKey(new Date());
    const cells: CalendarCell[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const key = this.toDateKey(cursor);

      cells.push({
        date: new Date(cursor),
        inCurrentMonth: cursor.getMonth() === month,
        isToday: key === todayKey,
        events: map.get(key) ?? []
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return cells;
  }

  get selectedDayLabel(): string {
    const found = this.calendarCells.find(
      cell => this.toDateKey(cell.date) === this.selectedDateKey
    );

    if (!found) {
      return '';
    }

    return found.date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  private ensureSelectedDate(): void {
    const exists = this.calendarCells.some(cell => this.toDateKey(cell.date) === this.selectedDateKey);
    if (!exists && this.calendarCells.length > 0) {
      this.selectedDateKey = this.toDateKey(this.calendarCells[0].date);
    }
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}