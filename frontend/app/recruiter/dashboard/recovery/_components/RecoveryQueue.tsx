"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { HeldTransitionItem, ID, RecoveryQueue as RecoveryQueueData, UndeliveredNotificationItem } from "@/app/common/types";
import { runRecoveryAction } from "@/app/common/services/jobs";

const SOURCE_LABELS: Record<string, string> = {
  resume_screening: "Resume screening",
  assessment: "Assessment result",
  ai_interview: "AI interview result",
};

const KIND_LABELS: Record<string, string> = {
  practical_booked: "Practical assessment confirmation",
  practical_cancelled: "Practical assessment cancellation",
  practical_no_show: "Missed practical assessment notice",
  practical_booking_invite: "Practical assessment booking link",
  manual_rejection: "Decision email",
  screening_rejection: "Screening result email",
  application_received: "Application received email",
  offer_extended: "Offer notice",
  interview_scheduled_notice: "Interview scheduled notice",
  interview_slot_invite: "Interview time invitation",
  ai_interview_invite: "AI interview invitation",
  ai_interview_reminder: "AI interview reminder",
  ai_interview_no_show: "Missed AI interview notice",
  contact_by_phone: "Needs a phone call",
};

const RESULT_TOAST: Record<string, string> = {
  resolved: "Released – the candidate has been moved on",
  superseded: "Already moved on – nothing to do",
  blocked: "Still blocked – see the reason shown",
  queued: "Queued for another delivery attempt",
  dismissed: "Dismissed",
};

const RecoveryQueue = ({ initial }: { initial: RecoveryQueueData }) => {
  const [queue, setQueue] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (kind: "holds" | "notifications", id: ID, action: "retry" | "dismiss") => {
    const note = action === "dismiss" ? window.prompt("Note (optional): how was this handled?") ?? undefined : undefined;
    if (action === "dismiss" && note === undefined) return;
    setBusy(`${kind}-${id}-${action}`);
    const response = await runRecoveryAction(kind, id, action, note || undefined);
    setBusy(null);
    if (!response.success) return toast.error(response.error || "Could not complete that action");
    const result = response.data!.result;
    toast.message(RESULT_TOAST[result] || result);
    if (result !== "blocked") {
      setQueue(current => ({
        holds: kind === "holds" ? current.holds.filter(item => item.id !== id) : current.holds,
        notifications: kind === "notifications" ? current.notifications.filter(item => item.id !== id) : current.notifications,
      }));
    }
  };

  const button = (kind: "holds" | "notifications", id: ID, action: "retry" | "dismiss", label: string, primary = false) => {
    const key = `${kind}-${id}-${action}`;
    return <button type='button' disabled={busy !== null} onClick={() => act(kind, id, action)} className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium disabled:opacity-60 ${primary ? "bg-primary text-white" : "border border-[#D0D5DD] text-primary-black"}`}>{busy === key ? <Loader2 className='h-4 w-4 animate-spin' /> : label}</button>;
  };

  if (!queue.holds.length && !queue.notifications.length) return <div className='rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-14 text-center text-secondary-black'>Nothing needs attention right now.</div>;

  return <div className='flex flex-col gap-8'>
    {!!queue.holds.length && <section><h2 className='mb-3 font-semibold text-primary-black'>Held progressions ({queue.holds.length})</h2><div className='flex flex-col gap-3'>{queue.holds.map((hold: HeldTransitionItem) => <div key={hold.id} className='rounded-2xl border border-[#EAECF0] bg-white p-4 shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-3'><div><p className='font-medium text-primary-black'>{hold.candidate_name}</p><p className='text-sm text-secondary-black'>{hold.job_title} · {SOURCE_LABELS[hold.source] || hold.source}</p></div><div className='flex gap-2'>{button("holds", hold.id, "retry", "Re-check now", true)}{button("holds", hold.id, "dismiss", "Dismiss")}</div></div>
      <p className='mt-3 rounded-lg bg-[#FFFAEB] p-3 text-sm text-[#B54708]'>{hold.reason}</p>
      <p className='mt-2 text-xs text-secondary-black'>Waiting to move from {hold.from_status.replaceAll("_", " ").toLowerCase()} to {hold.target_status.replaceAll("_", " ").toLowerCase()}. Re-checked automatically every few minutes; {hold.attempts} check(s) so far.</p>
    </div>)}</div></section>}
    {!!queue.notifications.length && <section><h2 className='mb-3 font-semibold text-primary-black'>Messages not delivered ({queue.notifications.length})</h2><div className='flex flex-col gap-3'>{queue.notifications.map((item: UndeliveredNotificationItem) => <div key={item.id} className='rounded-2xl border border-[#EAECF0] bg-white p-4 shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-3'><div><p className='font-medium text-primary-black'>{item.candidate_name}</p><p className='text-sm text-secondary-black'>{item.job_title} · {KIND_LABELS[item.kind] || item.kind}</p></div><div className='flex gap-2'>{item.status === "DEAD" && button("notifications", item.id, "retry", "Retry", true)}{button("notifications", item.id, "dismiss", item.status === "SKIPPED" ? "Done – I called them" : "Dismiss")}</div></div>
      <p className='mt-3 rounded-lg bg-[#FEF3F2] p-3 text-sm text-[#B42318]'>{item.status === "SKIPPED" ? item.last_error : `Delivery failed after ${item.attempts} attempts: ${item.last_error}`}</p>
    </div>)}</div></section>}
  </div>;
};

export default RecoveryQueue;
