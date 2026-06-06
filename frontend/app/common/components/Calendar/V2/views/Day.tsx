import { BsClock } from "react-icons/bs";
import { isSameDay, isToday, format } from "date-fns";
import type { CalendarDate } from "@yet3/use-calendar";

import { cn } from "@/app/common/utils";
import { CalendarEvent } from "../calendar.types";

const Day = ({
  events = [],
  calendarDate,
  cellHeight,
  onEventClick,
}: {
  events?: CalendarEvent[];
  calendarDate: CalendarDate;
  cellHeight: number;
  onEventClick: (event: CalendarEvent) => void;
}) => {
  const timeArr = Array(12)
    .fill(0)
    .map((_, i) => i + 9);
  return (
    <>
      <div className='grid grid-cols-[repeat(15,minmax(0,1fr))] border border-[#e5e7eb]'>
        <div className='flex items-center justify-center py-3 md:py-6'>
          <BsClock className='text-[#C3CAD9] text-3xl' />
        </div>
        <div className='col-start-2 col-end-[16] border-l border-[#e5e7eb]' />
      </div>
      <div className='grid grid-cols-[repeat(15,minmax(0,1fr))] border-[#e5e7eb] border border-t-0 overflow-hidden'>
        <div className='flex flex-col'>
          {timeArr.map((t, i) => (
            <div
              key={t}
              className={cn(
                "text-xs text-[#ADB8CC] font-bold flex items-center justify-center",
                i !== 0 && "border-t border-[#e5e7eb]"
              )}
              style={{ height: cellHeight }}
            >
              {`${t < 10 ? "0" : ""}${t}`}
            </div>
          ))}
        </div>
        {/* Day & events */}
        <div className='col-start-2 col-end-[16] border-r border-[#F5F6F7]'>
          {timeArr.map((t, i) => (
            <div
              key={`${i}-${t}`}
              className={cn(
                "text-xs text-[#ADB8CC] font-bold text-center border-l border-t border-[#e5e7eb] w-full relative",
                i === 0 && "border-t-0",
                isToday(calendarDate.date) && "bg-[#EAF6FF]"
              )}
              style={{ height: cellHeight }}
            >
              {events
                .filter(
                  e =>
                    e.start &&
                    isSameDay(e.start!, calendarDate.date) &&
                    e.start.getHours() === t
                )
                .map((e, i) => {
                  const start = e.start!;
                  const end = e.end!;
                  const startHour = start.getHours();
                  const startMinute = start.getMinutes();
                  const endHour = end.getHours();
                  const endMinute = end.getMinutes();
                  const meetingDuration =
                    endHour + endMinute / 60 - (startHour + startMinute / 60);
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
                      disabled={!e.resource?.room_name || end < new Date()}
                      className='rounded-lg p-1 absolute left-0 font-roboto text-center right-0'
                    >
                      <div
                        className='text-xs font-bold'
                        style={{ color: e.resource?.color }}
                      >
                        {`${format(start, "HH:mm")} - ${format(end, "HH:mm")}`}
                      </div>
                      <p className='text-xs text-clip text-[#4D5E80]'>
                        {e.title}
                      </p>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Day;
