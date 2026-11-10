"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { bookPracticalSlot, cancelPracticalBooking, getPracticalBooking } from "@/app/common/services/schedule";
import { ID, PracticalBookingState } from "@/app/common/types";

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });

const PracticalBooking = ({ token, initial }: { token: string; initial: PracticalBookingState }) => {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    const res = await getPracticalBooking(token);
    if (res.success) setState(res.data);
  };

  const book = async (slotId: ID) => {
    setBusy(`book-${slotId}`);
    const res = await bookPracticalSlot(token, slotId);
    if (!res.success) {
      toast.error(res.error || "Could not book that time");
      await refresh();
    } else {
      toast.success("Your assessment is booked");
      await refresh();
    }
    setBusy(null);
  };

  const cancel = async () => {
    if (!window.confirm("Cancel this appointment?")) return;
    setBusy("cancel");
    const res = await cancelPracticalBooking(token, "");
    if (!res.success) toast.error(res.error || "Could not cancel");
    else toast.success("Appointment cancelled");
    await refresh();
    setBusy(null);
  };

  const { policy, scheduled } = state;

  return <div className='flex flex-col gap-6'>
    <div className='rounded-xl bg-[#F9FAFB] p-4 text-sm'>
      <p className='font-medium text-primary-black'>{state.title}</p>
      {state.instructions && <p className='mt-1 whitespace-pre-wrap text-secondary-black'>{state.instructions}</p>}
      <p className='mt-2 text-xs text-secondary-black'>Up to {policy.max_attempts} attempt(s). {policy.cancellation_cutoff_hours > 0 ? `You can book or cancel online until ${policy.cancellation_cutoff_hours} hours before the appointment. ` : ""}Missing an appointment {policy.no_show_counts_as_attempt ? "counts as an attempt" : "is recorded but does not use an attempt"}.</p>
    </div>

    {scheduled && <div className='rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] p-4'>
      <p className='font-semibold text-[#067647]'>Your appointment</p>
      <p className='mt-1 text-sm text-primary-black'>{when(scheduled.slot.starts_at)}</p>
      <p className='text-sm text-secondary-black'>{scheduled.slot.location}</p>
      {scheduled.slot.instructions && <p className='mt-2 whitespace-pre-wrap text-sm text-secondary-black'>{scheduled.slot.instructions}</p>}
      <button type='button' disabled={busy !== null} onClick={cancel} className='mt-3 inline-flex h-9 items-center rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm font-medium disabled:opacity-60'>{busy === "cancel" ? <Loader2 className='h-4 w-4 animate-spin' /> : "Cancel appointment"}</button>
    </div>}

    {!scheduled && !state.can_book && <p className='rounded-lg bg-[#FFFAEB] p-3 text-sm text-[#B54708]'>{state.blocked_reason}</p>}

    {state.can_book && <div className='flex flex-col gap-2'>
      <h2 className='font-semibold text-primary-black'>Choose a time</h2>
      {!state.slots.length && <p className='text-sm text-secondary-black'>No times are open right now. Please check back or contact the hiring team.</p>}
      {state.slots.map(slot => <div key={slot.id} className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EAECF0] bg-white p-3'>
        <div><p className='text-sm font-medium text-primary-black'>{when(slot.starts_at)}</p><p className='text-xs text-secondary-black'>{slot.location}</p></div>
        <button type='button' disabled={busy !== null} onClick={() => book(slot.id)} className='inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60'>{busy === `book-${slot.id}` ? <Loader2 className='h-4 w-4 animate-spin' /> : "Book"}</button>
      </div>)}
    </div>}

    {!!state.history.length && <div>
      <h2 className='mb-2 font-semibold text-primary-black'>Previous attempts</h2>
      <ul className='flex flex-col gap-1 text-sm text-secondary-black'>{state.history.map(item => <li key={item.id}>Attempt {item.attempt_number} · {when(item.slot.starts_at)} · {item.status === "COMPLETED" ? (item.outcome === "PASS" ? "Passed" : "Not passed") : item.status === "NO_SHOW" ? "Missed" : "Cancelled"}</li>)}</ul>
    </div>}
  </div>;
};

export default PracticalBooking;
