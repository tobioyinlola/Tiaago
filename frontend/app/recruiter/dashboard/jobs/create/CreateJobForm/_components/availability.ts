import { InterviewAvailabilityInput, InterviewSlotInput } from "@/app/common/types";

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatLocalDate = (d: Date): string => {
  // Manual formatting (not toISOString, which converts to UTC and can roll
  // the date back a day depending on the recruiter's timezone offset) --
  // this must stay the recruiter's own local calendar date.
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Expands a day-of-week + time-range availability picker into concrete
 * date-based interview slots -- the shape the backend actually accepts --
 * by generating the next `weeksAhead` occurrences of each selected weekday,
 * starting from tomorrow (never today, so a slot can't already be in the
 * past by the time the job goes live). */
export const expandAvailabilityToSlots = (
  availability: InterviewAvailabilityInput,
  weeksAhead = 4
): InterviewSlotInput[] => {
  const { days_of_week, start_time, end_time } = availability;
  if (!days_of_week?.length || !start_time || !end_time) return [];

  const slots: InterviewSlotInput[] = [];
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const day of days_of_week) {
    // Days from tomorrow to the first occurrence of this weekday on/after it.
    const offset = (day - tomorrow.getDay() + 7) % 7;
    const firstOccurrence = new Date(tomorrow);
    firstOccurrence.setDate(tomorrow.getDate() + offset);

    for (let week = 0; week < weeksAhead; week++) {
      const date = new Date(firstOccurrence);
      date.setDate(firstOccurrence.getDate() + week * 7);
      slots.push({ date: formatLocalDate(date), start_time, end_time });
    }
  }

  return slots;
};

/** 30-minute-increment time-of-day options for the wizard's time-range
 * selects -- a plain labeled dropdown renders consistently across browsers
 * and is more touch-friendly than the native time input's spinner UI. */
export const TIME_OPTIONS: { value: string; label: string }[] = Array.from(
  { length: 48 },
  (_, i) => {
    const hours24 = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? "00" : "30";
    const value = `${String(hours24).padStart(2, "0")}:${minutes}`;
    const period = hours24 < 12 ? "AM" : "PM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return { value, label: `${hours12}:${minutes} ${period}` };
  }
);
