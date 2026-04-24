export interface CalendarEventItemResponse {
  eventId: string;
  title: string;
  category: string | null;
  status: string;
  audience: string | null;
  departmentName: string;
  startAt: string;
  durationMinutes: number | null;
  registered: boolean;
  adminView: boolean;
}

export interface CalendarDayGroupResponse {
  date: string;
  events: CalendarEventItemResponse[];
}

export interface CalendarRangeResponse {
  from: string;
  to: string;
  days: CalendarDayGroupResponse[];
}