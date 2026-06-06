import {
  addDays,
  isSameDay,
  isToday,
  format,
  isSameWeek,
  startOfWeek,
  setDay,
  setHours,
} from "date-fns";
import { BsClock } from "react-icons/bs";
import type { CalendarDate } from "@yet3/use-calendar";

import { cn, optimizeCount } from "@/app/common/utils";
import { CalendarEvent, CalendarView } from "../calendar.types";

const Week = ({
  events = [],
  calendarDate,
  cellHeight,
  cellWidth,
  setView,
  onEventClick,
}: {
  events?: CalendarEvent[];
  calendarDate: CalendarDate;
  cellWidth: number;
  cellHeight: number;
  setView: (view: CalendarView) => void;
  onEventClick: (event: CalendarEvent) => void;
}) => {
  const timeArr = Array(12)
    .fill(0)
    .map((_, i) => i + 9);
  const firstDayOfWeek = startOfWeek(calendarDate.date);
  return (
    <>
      <div className='grid grid-cols-8 md:grid-cols-[repeat(15,minmax(0,1fr))] border border-[#F5F6F7]'>
        <div className='flex items-center justify-center py-3 md:py-6'>
          <BsClock className='text-[#C3CAD9] text-xl md:text-3xl' />
        </div>
        <div className='md:col-start-2 md:col-end-[16] max-md:col-span-7 grid grid-cols-7 text-center'>
          {Array(7)
            .fill(0)
            .map((_, i) => {
              const day = addDays(firstDayOfWeek, i);
              const noOfEvents = events.filter(
                e => e.start && isSameDay(e.start, day)
              ).length;
              return (
                <div
                  role='button'
                  key={day.toDateString() + i}
                  className={cn(
                    "text-xs font-bold text-[#6B7A99] py-3 md:py-6 flex items-center justify-center border-l border-[#F5F6F7] relative",
                    isToday(day) && "text-primary"
                  )}
                  onClick={() => {
                    calendarDate.set(day);
                    setView("day");
                  }}
                  // style={{ width: cellWidth }}
                >
                  <span className='max-md:hidden'>{format(day, "EEEE d")}</span>
                  <span className='md:hidden'>{format(day, "E")[0]}</span>
                  {!!noOfEvents && (
                    <div className='absolute top-0 right-0 badge bg-primary text-white text-xs font-bold z-[2]'>
                      {optimizeCount(noOfEvents)}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
      <div className='grid grid-cols-8 md:grid-cols-[repeat(15,minmax(0,1fr))] border-[#F5F6F7] border border-t-0 overflow-hidden'>
        <div className='flex flex-col'>
          {timeArr.map((t, i) => (
            <div
              key={t}
              className={cn(
                "text-xs text-[#ADB8CC] font-bold flex items-center justify-center max-md:!h-10",
                i !== 0 && "border-t border-[#F5F6F7]"
              )}
              style={{ height: cellHeight }}
            >
              {`${t < 10 ? "0" : ""}${t}`}
            </div>
          ))}
        </div>
        {/* Days & events */}
        <div className='md:col-start-2 md:col-end-[16] max-md:col-span-7 border-r border-[#F5F6F7]'>
          {timeArr.map((t, i) => (
            <div key={t} className='grid grid-cols-7'>
              {Array(7)
                .fill(0)
                .map((_, j) => {
                  const _events = events.filter(
                    e =>
                      e.start &&
                      isSameWeek(e.start!, firstDayOfWeek) &&
                      e.start.getHours() === t &&
                      e.start.getDay() === j
                  );
                  const day = addDays(firstDayOfWeek, j);
                  const dayAtHour = setHours(day, t);
                  return (
                    <div
                      key={j}
                      className={cn(
                        "text-xs text-[#ADB8CC] font-bold text-center border-l border-t border-[#F5F6F7] relative max-md:!h-10 max-md:flex items-center justify-center",
                        i === 0 && "border-t-0"
                      )}
                      style={{ height: cellHeight }}
                    >
                      {_events.map((e, i) => {
                        const start = e.start!;
                        const end = e.end!;
                        const startHour = start.getHours();
                        const startMinute = start.getMinutes();
                        const endHour = end.getHours();
                        const endMinute = end.getMinutes();
                        const meetingDuration =
                          endHour +
                          endMinute / 60 -
                          (startHour + startMinute / 60);
                        const top = (startMinute / 60) * cellHeight;
                        const height = meetingDuration * cellHeight;
                        return (
                          <button
                            title={`${e.title}`}
                            key={`#${i + 1} ${e.title}`}
                            style={{
                              top,
                              height,
                              zIndex: i + 2,
                              backgroundColor:
                                e.resource?.color && `${e.resource.color}0D`,
                              borderWidth: 2,
                              borderColor: e.resource?.color,
                            }}
                            onClick={() => onEventClick(e)}
                            disabled={
                              !e.resource?.room_name || end < new Date()
                            }
                            className='rounded-lg p-1 absolute left-0 font-roboto text-center w-full max-md:hidden'
                          >
                            <div
                              className='text-xs font-bold max-sm:leading-none'
                              style={{ color: e.resource?.color }}
                            >
                              {`${format(start, "HH:mm")} - ${format(
                                end,
                                "HH:mm"
                              )}`}
                            </div>
                            <p className='text-xs text-clip text-[#4D5E80] max-md:hidden'>
                              {e.title}
                            </p>
                          </button>
                        );
                      })}
                      {!!_events.length && (
                        <button
                          onClick={() => {
                            calendarDate.set(addDays(firstDayOfWeek, j));
                            setView("day");
                          }}
                          className='badge badge-primary text-xs text-white font-bold rounded-full md:hidden'
                        >
                          {optimizeCount(_events.length)}
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Week;
