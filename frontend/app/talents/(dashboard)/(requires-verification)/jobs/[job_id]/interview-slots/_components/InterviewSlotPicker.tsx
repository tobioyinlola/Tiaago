"use client";

import { toast } from "sonner";
import { useState } from "react";
import { CalendarClock, CheckCircle2 } from "lucide-react";

import { cn } from "@/app/common/utils";
import { ID, InterviewSlot } from "@/app/common/types";
import Button from "@/app/common/components/DaisyButton";
import {
  claimGuestInterviewSlot,
  claimInterviewSlot,
} from "@/app/common/services/schedule";

const formatSlotLabel = (slot: InterviewSlot) => {
  const date = new Date(`${slot.date}T${slot.start_time}`);
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return { dateLabel, timeLabel: `${slot.start_time} - ${slot.end_time}` };
};

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
  const [selectedId, setSelectedId] = useState<ID | undefined>();
  const [isClaiming, setIsClaiming] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState<InterviewSlot | null>(null);

  const handleClaim = async () => {
    if (!selectedId) return;
    setIsClaiming(true);
    toast.dismiss();
    const result = token
      ? await claimGuestInterviewSlot(token, selectedId)
      : await claimInterviewSlot(jobId!, selectedId);
    setIsClaiming(false);
    if (result.success) {
      setConfirmedSlot(result.data);
      toast.success("Interview time confirmed");
    } else {
      toast.error(result.error);
      // The slot may have just been claimed by someone else -- refresh the list.
      setSlots(current => current.filter(slot => slot.id !== selectedId));
      setSelectedId(undefined);
    }
  };

  if (confirmedSlot) {
    const { dateLabel, timeLabel } = formatSlotLabel(confirmedSlot);
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-16 rounded-lg border border-[#EAECF0] text-center'>
        <CheckCircle2 className='h-10 w-10 text-success' />
        <h2 className='text-lg font-semibold'>Interview confirmed</h2>
        <p className='text-sm text-secondary-black'>
          {dateLabel} &middot; {timeLabel}
        </p>
        <p className='text-xs text-secondary-black max-w-sm'>
          You&apos;ll receive a confirmation email with the meeting details shortly.
        </p>
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-16 rounded-lg border border-dashed border-[#EAECF0] text-center'>
        <CalendarClock className='h-8 w-8 text-secondary-black' />
        <p className='text-sm text-secondary-black max-w-sm'>
          No interview slots are available right now. Check back soon, or reach out to
          the company directly.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <div
        role='radiogroup'
        aria-label='Available interview slots'
        className='grid sm:grid-cols-2 gap-3'
      >
        {slots.map(slot => {
          const { dateLabel, timeLabel } = formatSlotLabel(slot);
          const isSelected = selectedId === slot.id;
          return (
            <label
              key={slot.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors duration-200 hover:border-primary/40",
                isSelected ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <div>
                <p className='font-medium text-sm'>{dateLabel}</p>
                <p className='text-xs text-muted-foreground'>{timeLabel}</p>
              </div>
              <input
                type='radio'
                name='interview-slot'
                checked={isSelected}
                onChange={() => setSelectedId(slot.id)}
                className='radio radio-primary radio-sm'
              />
            </label>
          );
        })}
      </div>

      <Button
        onClick={handleClaim}
        loading={isClaiming}
        disabled={!selectedId || isClaiming}
        color='primary'
        className='text-white w-full max-w-[220px]'
      >
        {isClaiming ? "" : "Confirm interview time"}
      </Button>
    </div>
  );
};

export default InterviewSlotPicker;
