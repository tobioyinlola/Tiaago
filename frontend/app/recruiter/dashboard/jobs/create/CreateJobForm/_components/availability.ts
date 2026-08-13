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

/** Minutes since midnight, so a time range can be chunked arithmetically. */
const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const fromMinutes = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const SLOT_DURATION_MINUTES = 30;

/** Expands a day-of-week + time-range availability picker into concrete
 * date-based interview slots -- the shape the backend actually accepts --
 * by generating the next `weeksAhead` occurrences of each selected weekday,
 * starting from today (included if today's weekday is selected and part of
 * the time range is still ahead -- a candidate opening their invite this
 * evening should be able to book a slot later tonight, not only from
 * tomorrow), and chunking the recruiter's chosen time range into individual
 * 30-minute slots within each day (e.g. "9:00 AM - 5:00 PM" becomes sixteen
 * 9:00-9:30, 9:30-10:00, ... 16:30-17:00 slots) rather than one single
 * all-day slot -- a candidate needs to pick a specific 30-minute time, not
 * book out someone's entire day. Today's slots that have already started are
 * skipped so nothing already-past gets offered (see also the matching
 * backend filter in JobInterviewSlotListView/GuestInterviewSlotListView,
 * which excludes past slots even after they've been stored -- this
 * generation-time skip only covers the moment the recruiter sets up
 * availability). */
export const expandAvailabilityToSlots = (
  availability: InterviewAvailabilityInput,
  weeksAhead = 4
): InterviewSlotInput[] => {
  const { days_of_week, start_time, end_time } = availability;
  if (!days_of_week?.length || !start_time || !end_time) return [];

  const startMinutes = toMinutes(start_time);
  const endMinutes = toMinutes(end_time);
  if (endMinutes <= startMinutes) return [];

  const slots: InterviewSlotInput[] = [];
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStr = formatLocalDate(todayStart);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const day of days_of_week) {
    // Days from today to the first occurrence of this weekday on/after it
    // -- 0 when today itself is one of the selected days.
    const offset = (day - todayStart.getDay() + 7) % 7;
    const firstOccurrence = new Date(todayStart);
    firstOccurrence.setDate(todayStart.getDate() + offset);

    for (let week = 0; week < weeksAhead; week++) {
      const date = new Date(firstOccurrence);
      date.setDate(firstOccurrence.getDate() + week * 7);
      const dateStr = formatLocalDate(date);
      const isToday = dateStr === todayStr;

      for (
        let slotStart = startMinutes;
        slotStart + SLOT_DURATION_MINUTES <= endMinutes;
        slotStart += SLOT_DURATION_MINUTES
      ) {
        if (isToday && slotStart <= nowMinutes) continue;

        slots.push({
          date: dateStr,
          start_time: fromMinutes(slotStart),
          end_time: fromMinutes(slotStart + SLOT_DURATION_MINUTES),
        });
      }
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
