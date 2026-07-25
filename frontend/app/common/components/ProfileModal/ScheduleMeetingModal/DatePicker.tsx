import {
  format,
  isSameDay,
  getDaysInMonth,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import {
  IoArrowBackCircleOutline,
  IoArrowForwardCircleOutline,
} from "react-icons/io5";
import { useEffect, useState } from "react";
import { useCalendar } from "@yet3/use-calendar";

import { cn } from "@/app/common/utils";

const DatePicker = ({
  onSelectDate,
}: {
  onSelectDate: (date: Date) => void;
}) => {
  const today = new Date();
  const { calendarDate } = useCalendar();
  const currentMonth = startOfMonth(calendarDate.date);
  const daysInMonth = getDaysInMonth(calendarDate.date);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const selectedStep = Math.floor(calendarDate.date.getDate() / 5) * 5;
  const [daysStep, setDaysStep] = useState(selectedStep);
  const daysToShow = days.slice(daysStep, daysStep + 5);

  useEffect(() => {
    onSelectDate(calendarDate.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarDate.date]);

  const _navigateMonth = (step: number) => {
    calendarDate.add(step, "months");
    setDaysStep(0);
  };

  return (
    <>
      <div className='flex items-center justify-between bg-[#D9DDFF] rounded-t-lg p-4'>
        <button
          onClick={() => _navigateMonth(-1)}
          disabled={isSameMonth(currentMonth, today)}
          className='disabled:cursor-not-allowed'
        >
          <IoArrowBackCircleOutline className='hover:text-gray-600 text-[#292D32] text-2xl' />
        </button>
        <p className='text-base text-gray-900'>
          {format(currentMonth, "MMMM, yyyy")}
        </p>
        <button onClick={() => _navigateMonth(1)}>
          <IoArrowForwardCircleOutline className='hover:text-gray-600 text-[#292D32] text-2xl' />
        </button>
      </div>
      <div className='flex items-center p-4 gap-2 border-x border-b border-[#D0D5DD] rounded-b-lg'>
        <button
          onClick={() => setDaysStep(prev => prev - 5)}
          disabled={daysStep < 5}
          className='text-gray-400 disabled:cursor-not-allowed text-base'
        >
          <IoArrowBackCircleOutline />
        </button>
        <div className='grid grid-cols-5 gap-2 text-center'>
          {/* carousel showing 5 days in the month at a time */}
          {daysToShow.map((day, i) => {
            const currentDate = new Date(
              currentMonth.getFullYear(),
              currentMonth.getMonth(),
              day
            );
            const isSelected = isSameDay(calendarDate.date, currentDate);
            return (
              <button
                onClick={() => calendarDate.set(currentDate)}
                className={cn(
                  "btn py-1 text-sm rounded relative flex flex-col h-fit",
                  isSelected && "btn-primary"
                )}
                key={`day-${day}-month-${currentMonth.getMonth()}`}
              >
                <p className={cn(!isSelected && "text-[#999999]")}>
                  {format(currentDate, "EEE")}
                </p>
                <p className='font-semibold text-2xl'>{day}</p>
                {isSameDay(today, currentDate) && (
                  <span className='w-2 h-2 bg-primary rounded-full absolute top-1 right-1' />
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setDaysStep(prev => prev + 5)}
          disabled={daysStep + 5 >= daysInMonth}
          className='text-gray-400 hover:text-gray-500 disabled:cursor-not-allowed text-base'
        >
          <IoArrowForwardCircleOutline />
        </button>
      </div>
    </>
  );
};

export default DatePicker;
