export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: any;
}
