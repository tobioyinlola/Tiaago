import { isSameMonth, isSameDay, isToday, format } from "date-fns";
import type { CalendarDate, CalendarGroup } from "@yet3/use-calendar";

import { cn, optimizeCount } from "@/app/common/utils";
import { CalendarEvent, CalendarView } from "../calendar.types";

const Month = ({
  events = [],
  calendarDate,
  cellHeight,
  onEventClick,
  setView,
  groupedDays,
}: {
  events?: CalendarEvent[];
  calendarDate: CalendarDate;
  cellHeight: number;
  setView: (view: CalendarView) => void;
  onEventClick: (event: CalendarEvent) => void;
  groupedDays: CalendarGroup[];
}) => {
  const noOfRows = groupedDays[0].days.length;
  return (
    <>
      <div className='grid grid-cols-7 text-center border border-[#F5F6F7]'>
        {[
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ].map(day => (
          <div
            key={day}
            className='text-xs font-bold text-[#6B7A99] py-3 md:py-6 flex items-center justify-center border-l border-[#F5F6F7]'
          >
            <span className='max-md:hidden'>{day}</span>
            <span className='md:hidden'>{day[0]}</span>
          </div>
        ))}
      </div>
      {Array(noOfRows)
        .fill(0)
        .map((_, i) => (
          <div key={i} className='grid grid-cols-7 border border-[#F5F6F7]'>
            {Array(7)
              .fill(0)
              .map((_, j) => {
                const day = groupedDays[j].days[i];
                const _events = events.filter(
                  e => e.start && isSameDay(e.start, day.date)
                );
                return (
                  <div
                    key={day.date.toDateString() + j}
                    className={cn(
                      "font-bold text-[#6B7A99] p-1 flex flex-col items-center md:items-end gap-1 border-l border-[#F5F6F7] relative max-md:!h-16",
                      isToday(day.date) && "text-primary bg-[#EAF6FF]",
                      !isSameMonth(day.date, calendarDate.date) &&
                        "text-[#999999] bg-[#E6E6E6]"
                    )}
                    style={{ height: cellHeight }}
                  >
                    <button
                      onClick={() => {
                        calendarDate.set(day.date);
                        setView("day");
                      }}
                      className='h-fit'
                    >
                      {format(day.date, "dd")}
                    </button>
                    <button
                      onClick={() => {
                        calendarDate.set(day.date);
                        setView("day");
                      }}
                      className='max-md:absolute left-0 right-0 top-0 bottom-0 bg-transparent md:hidden'
                    />
                    {_events.slice(0, 2).map((event, i) => (
                      <button
                        key={i}
                        className='p-1 rounded-md w-full max-md:hidden'
                        onClick={() => onEventClick(event)}
                        style={{
                          color: event.resource.color,
                          backgroundColor:
                            event.resource?.color &&
                            `${event.resource.color}0D`,
                          borderWidth: 1,
                          borderColor: event.resource?.color,
                        }}
                        disabled={
                          !event.resource?.room_name || event.end < new Date()
                        }
                      >
                        <div className='line-clamp-1 text-sm'>
                          {event.title}
                        </div>
                      </button>
                    ))}
                    {_events.length > 2 && (
                      <div className='badge badge-primary text-xs text-white font-bold rounded-full absolute bottom-[2px] right-[2px] z-[2]'>
                        +{optimizeCount(_events.length - 2)}
                      </div>
                    )}
                    {!!_events.length && (
                      <div className='badge badge-primary text-xs text-white font-bold rounded-full mx-auto my-auto md:hidden'>
                        {optimizeCount(_events.length)}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
    </>
  );
};

export default Month;
