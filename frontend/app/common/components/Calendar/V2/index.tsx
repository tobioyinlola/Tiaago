"use client";
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useRef, useState } from "react";
import { useCalendar } from "@yet3/use-calendar";

import Day from "./views/Day";
import Week from "./views/Week";
import Toolbar from "./Toolbar";
import Month from "./views/Month";
import ScrollArea from "../../ScrollArea";
import JoinMeetingModal from "../JoinMeetingModal";
import { ScheduledMeeting } from "@/app/common/types";
import { CalendarEvent, CalendarView } from "./calendar.types";
import { cn } from "@/app/common/utils";

const colors = [
  "#29CC39",
  "#FF6633",
  "#8833FF",
  "#33BFFF",
  "#E62E7B",
  "#FFCB33",
  "#CC7429",
  "#2EE6CA",
];

const CalendarV2 = ({
  scheduledEvents = [],
  className,
  defaultView = "week",
  isSingleView = false,
}: {
  scheduledEvents?: ScheduledMeeting[];
  className?: string;
  defaultView?: CalendarView;
  isSingleView?: boolean;
}) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<CalendarView>(defaultView);
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent>();
  const { calendarDate, groupedDays } = useCalendar({
    alwaysSixRows: false,
    calendarStartDay: "sunday",
  });
  const cellHeight = 100;
  const cellWidth = 150;
  const views: CalendarView[] = ["month", "week", "day"];
  const events = scheduledEvents.map(
    ({ title, start_time, meeting_date, end_time, talent, ...rest }, i) => {
      const start = `${meeting_date}T${start_time}`;
      const end = `${meeting_date}T${end_time}`;
      return {
        title,
        start: new Date(start),
        end: new Date(end),
        resource: {
          color: colors[i % colors.length],
          ...rest,
        },
      };
    }
  );

  const formatDateRange = (d1: Date, d2: Date) =>
    `${format(d1, "MMM d")} - ${format(d2, "d, yyyy")}`;
  const firstDayOfWeek = startOfWeek(calendarDate.date);
  const lastDayOfWeek = endOfWeek(calendarDate.date);
  const firstDayOfMonth = startOfMonth(calendarDate.date);
  const lastDayOfMonth = endOfMonth(calendarDate.date);

  const handleSetView = (v: CalendarView) => {
    if (!isSingleView) {
      setView(v);
    }
  };

  const getLabel = () => {
    switch (view) {
      case "week":
        return formatDateRange(firstDayOfWeek, lastDayOfWeek);
      case "day":
        return calendarDate.format("EEEE MMM dd");
      case "month":
        return format(calendarDate.date, "MMMM yyyy");

      default:
        return formatDateRange(firstDayOfMonth, lastDayOfMonth);
    }
  };

  return (
    <div
      className={cn(
        "bg-white p-3 md:p-8 rounded-lg shadow-lg w-full mx-auto mb-12 mt-6 relative dashboard-content-constraint",
        className
      )}
    >
      <JoinMeetingModal modalRef={modalRef} currentEvent={currentEvent} />
      <h6 className='text-[#6B7A99] text-base font-bold text-center my-2 font-roboto md:hidden'>
        {getLabel()}
      </h6>
      {/* Toolbar */}
      <Toolbar
        {...{ view, setView: handleSetView, views, calendarDate, getLabel, isSingleView }}
      />
      {/* Calendar */}
      <ScrollArea className='dashboard-content-constraint'>
        {view === "month" && (
          <Month
            events={events}
            calendarDate={calendarDate}
            cellHeight={cellHeight}
            setView={handleSetView}
            onEventClick={event => {
              setCurrentEvent(event);
              modalRef.current?.showModal();
            }}
            groupedDays={groupedDays}
          />
        )}
        {!["month", "day"].includes(view) && (
          <Week
            events={events}
            calendarDate={calendarDate}
            cellHeight={cellHeight}
            cellWidth={cellWidth}
            setView={handleSetView}
            onEventClick={event => {
              setCurrentEvent(event);
              modalRef.current?.showModal();
            }}
          />
        )}
        {view === "day" && (
          <Day
            events={events}
            calendarDate={calendarDate}
            cellHeight={cellHeight}
            onEventClick={event => {
              setCurrentEvent(event);
              modalRef.current?.showModal();
            }}
          />
        )}
      </ScrollArea>
    </div>
  );
};

export default CalendarV2;
