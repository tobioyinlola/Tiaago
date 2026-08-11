"use client";

import { toast } from "sonner";
import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/app/common/utils";
import { ID, InterviewSlot } from "@/app/common/types";
import Button from "@/app/common/components/DaisyButton";
import {
  claimGuestInterviewSlot,
  claimInterviewSlot,
} from "@/app/common/services/schedule";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** `slot.date` is a plain "YYYY-MM-DD" string -- parsed as local components
 * (not `new Date(string)`, which treats a bare date as UTC midnight and can
 * roll it back a day depending on the candidate's own timezone offset). */
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatTime = (time: string): string => {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const formatDayHeading = (dateStr: string): string =>
  parseLocalDate(dateStr).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

const InterviewSlotPicker = ({
  jobId,
  token,
  initialSlots,
}: {
  // Exactly one of these is provided by the caller: jobId for the
  // authenticated-talent page, token for the guest (no-login) page.
  jobId?: ID;
  token?: string;
  initialSlots: InterviewSlot[];
}) => {
  const [slots, setSlots] = useState(initialSlots);
  const [selectedSlotId, setSelectedSlotId] = useState<ID | undefined>();
  const [isClaiming, setIsClaiming] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState<InterviewSlot | null>(null);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, InterviewSlot[]>();
    for (const slot of slots) {
      const list = map.get(slot.date) ?? [];
      list.push(slot);
      map.set(slot.date, list);
    }
    map.forEach(list => list.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [slots]);

  const sortedDates = useMemo(() => Array.from(slotsByDate.keys()).sort(), [slotsByDate]);
  const earliestDate = sortedDates[0];

  const [selectedDate, setSelectedDate] = useState<string | undefined>(earliestDate);
  const [viewDate, setViewDate] = useState<Date>(() =>
    earliestDate ? parseLocalDate(earliestDate) : new Date()
  );

  const handleSelectDate = (dateStr: string) => {
    if (!slotsByDate.has(dateStr)) return;
    setSelectedDate(dateStr);
    setSelectedSlotId(undefined);
  };

  const changeMonth = (delta: number) => {
    setViewDate(current => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const handleClaim = async () => {
    if (!selectedSlotId) return;
    setIsClaiming(true);
    toast.dismiss();
    const result = token
      ? await claimGuestInterviewSlot(token, selectedSlotId)
      : await claimInterviewSlot(jobId!, selectedSlotId);
    setIsClaiming(false);
    if (result.success) {
      setConfirmedSlot(result.data);
      toast.success("Interview time confirmed");
    } else {
      toast.error(result.error);
      // The slot may have just been claimed by someone else -- refresh the list.
      setSlots(current => current.filter(slot => slot.id !== selectedSlotId));
      setSelectedSlotId(undefined);
    }
  };

  if (confirmedSlot) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-16 rounded-xl border border-[#EAECF0] bg-white text-center'>
        <CheckCircle2 className='h-10 w-10 text-success' />
        <h2 className='text-lg font-semibold text-primaryBlack'>Interview confirmed</h2>
        <p className='text-sm text-secondary-black'>
          {formatDayHeading(confirmedSlot.date)} &middot; {formatTime(confirmedSlot.start_time)} -{" "}
          {formatTime(confirmedSlot.end_time)}
        </p>
        <p className='text-xs text-secondary-black max-w-sm'>
          You&apos;ll receive a confirmation email with the meeting link shortly.
        </p>
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-16 rounded-xl border border-dashed border-[#EAECF0] bg-white text-center'>
        <CalendarClock className='h-8 w-8 text-secondary-black' />
        <p className='text-sm text-secondary-black max-w-sm'>
          No interview slots are available right now. Check back soon, or reach out to
          the company directly.
        </p>
      </div>
    );
  }

  // Calendar grid for the currently-viewed month -- leading/trailing blanks
  // pad the first/last week out to full 7-day rows.
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendarCells: { dateStr: string; day: number; hasSlots: boolean; isPast: boolean }[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const dateStr = formatDateKey(cellDate);
    calendarCells.push({
      dateStr,
      day,
      hasSlots: slotsByDate.has(dateStr),
      isPast: cellDate < today,
    });
  }

  const selectedDaySlots = selectedDate ? slotsByDate.get(selectedDate) ?? [] : [];

  return (
    <div className='rounded-xl border border-[#EAECF0] bg-white overflow-hidden'>
      <div className='flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[#EAECF0]'>
        {/* Calendar */}
        <div className='p-5 sm:p-6 flex-1 lg:max-w-[420px]'>
          <div className='flex items-center justify-between mb-5'>
            <p className='text-base font-semibold text-primaryBlack'>
              {MONTH_LABELS[month]} {year}
            </p>
            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={() => changeMonth(-1)}
                aria-label='Previous month'
                className='w-8 h-8 flex items-center justify-center rounded-lg text-secondary-black hover:bg-[#F5F6F7] hover:text-primary'
              >
                <ChevronLeft className='w-4 h-4' />
              </button>
              <button
                type='button'
                onClick={() => changeMonth(1)}
                aria-label='Next month'
                className='w-8 h-8 flex items-center justify-center rounded-lg text-secondary-black hover:bg-[#F5F6F7] hover:text-primary'
              >
                <ChevronRight className='w-4 h-4' />
              </button>
            </div>
          </div>

          <div className='grid grid-cols-7 gap-1 mb-2'>
            {DAY_LABELS.map(label => (
              <div key={label} className='text-center text-[11px] font-semibold text-secondary-black py-1'>
                {label}
              </div>
            ))}
          </div>

          <div className='grid grid-cols-7 gap-1'>
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {calendarCells.map(({ dateStr, day, hasSlots, isPast }) => {
              const isSelected = dateStr === selectedDate;
              const isAvailable = hasSlots && !isPast;
              return (
                <button
                  key={dateStr}
                  type='button'
                  disabled={!isAvailable}
                  onClick={() => handleSelectDate(dateStr)}
                  className={cn(
                    "aspect-square rounded-lg text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-white"
                      : isAvailable
                      ? "bg-[#F5F6F7] text-primaryBlack hover:bg-primary/10 hover:text-primary"
                      : "text-[#D0D5DD] cursor-default"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots for the selected date */}
        <div className='p-5 sm:p-6 flex-1 flex flex-col'>
          {selectedDate ? (
            <>
              <p className='text-base font-semibold text-primaryBlack mb-4'>
                {formatDayHeading(selectedDate)}
              </p>
              <div className='flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1'>
                {selectedDaySlots.map(slot => {
                  const isSelected = selectedSlotId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type='button'
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={cn(
                        "w-full rounded-lg border-2 px-4 py-3 text-sm font-medium text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-[#EAECF0] text-primaryBlack hover:border-primary/40"
                      )}
                    >
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className='flex-1 flex items-center justify-center text-sm text-secondary-black text-center py-8'>
              Pick a highlighted date to see available times.
            </div>
          )}
        </div>
      </div>

      <div className='p-5 sm:p-6 border-t border-[#EAECF0]'>
        <Button
          onClick={handleClaim}
          loading={isClaiming}
          disabled={!selectedSlotId || isClaiming}
          color='primary'
          className='text-white w-full sm:w-auto sm:min-w-[220px]'
        >
          {isClaiming ? "" : "Confirm interview time"}
        </Button>
      </div>
    </div>
  );
};

export default InterviewSlotPicker;
