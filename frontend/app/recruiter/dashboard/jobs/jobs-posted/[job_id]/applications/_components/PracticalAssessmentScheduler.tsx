"use client";

import { CalendarPlus, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Job, JobApplication, PracticalAssessmentSlot } from "@/app/common/types";
import {
  createPracticalAssessmentSlot,
  getPracticalAssessmentSlots,
  scheduleApplicationPracticalAssessment,
} from "@/app/common/services/jobs";

const toLocalInput = (date: Date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
};

const PracticalAssessmentScheduler = ({ job, applications }: { job: Job; applications: JobApplication[] }) => {
  const [slots, setSlots] = useState<PracticalAssessmentSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [savingSlot, setSavingSlot] = useState(false);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Record<string, string>>({});
  const [slotForm, setSlotForm] = useState(() => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
      starts_at: toLocalInput(start),
      ends_at: toLocalInput(end),
      location: "",
      capacity: 1,
      instructions: "",
    };
  });

  useEffect(() => {
    getPracticalAssessmentSlots(job.public_id)
      .then(setSlots)
      .catch(error => toast.error(error.message || "Could not load practical-assessment slots"))
      .finally(() => setLoadingSlots(false));
  }, [job.public_id]);

  const candidates = useMemo(() => applications.filter(application => {
    const assessments = application.practical_assessments || [];
    return !assessments.some(assessment => assessment.status === "SCHEDULED");
  }), [applications]);

  const createSlot = async () => {
    if (!slotForm.location.trim()) return toast.error("Add the assessment location");
    const startsAt = new Date(slotForm.starts_at);
    const endsAt = new Date(slotForm.ends_at);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return toast.error("Choose a valid start and end time");
    }
    setSavingSlot(true);
    const result = await createPracticalAssessmentSlot(job.public_id, {
      ...slotForm,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      location: slotForm.location.trim(),
      instructions: slotForm.instructions.trim(),
      capacity: Number(slotForm.capacity),
    });
    setSavingSlot(false);
    if (!result.success || !result.data) return toast.error(result.success ? "Could not create the slot" : result.error || "Could not create the slot");
    setSlots(current => [...current, result.data!].sort((left, right) => left.starts_at.localeCompare(right.starts_at)));
    toast.success("Practical-assessment slot added");
  };

  const schedule = async (slot: PracticalAssessmentSlot) => {
    const applicationId = selectedCandidate[String(slot.id)];
    if (!applicationId) return toast.error("Choose a candidate for this slot");
    setScheduling(String(slot.id));
    const result = await scheduleApplicationPracticalAssessment(applicationId, slot.id);
    setScheduling(null);
    if (!result.success) return toast.error(result.error || "Could not schedule the assessment");
    setSlots(current => current.map(item => item.id === slot.id ? { ...item, scheduled_count: item.scheduled_count + 1 } : item));
    setSelectedCandidate(current => ({ ...current, [String(slot.id)]: "" }));
    toast.success("Candidate assigned to the practical assessment");
  };

  return <section className='mb-8 rounded-2xl border border-[#D0D5DD] bg-white p-5'>
    <div className='flex flex-wrap items-start justify-between gap-4'>
      <div><h2 className='text-lg font-semibold text-primary-black'>{job.practical_assessment_configuration?.title || "Practical assessment"}</h2><p className='mt-1 max-w-3xl text-sm text-secondary-black'>Create in-person slots and assign candidates. A completed pass is required before progression for this job.</p></div>
      <span className='rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-medium text-[#3538CD]'>Observed assessment</span>
    </div>
    <div className='mt-5 grid gap-3 rounded-xl bg-[#F9FAFB] p-4 lg:grid-cols-[1.1fr_1.1fr_1fr_100px]'>
      <label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Starts<input type='datetime-local' value={slotForm.starts_at} onChange={event => setSlotForm(current => ({ ...current, starts_at: event.target.value }))} className='h-10 rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm font-normal' /></label>
      <label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Ends<input type='datetime-local' value={slotForm.ends_at} onChange={event => setSlotForm(current => ({ ...current, ends_at: event.target.value }))} className='h-10 rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm font-normal' /></label>
      <label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Location<input value={slotForm.location} maxLength={255} onChange={event => setSlotForm(current => ({ ...current, location: event.target.value }))} placeholder='Depot, site, or assessment centre' className='h-10 rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm font-normal' /></label>
      <label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Capacity<input type='number' min={1} value={slotForm.capacity} onChange={event => setSlotForm(current => ({ ...current, capacity: Number(event.target.value) }))} className='h-10 rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm font-normal' /></label>
      <label className='flex flex-col gap-1 text-xs font-medium text-primary-black lg:col-span-3'>Candidate instructions <span className='font-normal text-secondary-black'>(optional)</span><input value={slotForm.instructions} maxLength={1200} onChange={event => setSlotForm(current => ({ ...current, instructions: event.target.value }))} placeholder='What to bring, where to check in, and any safety requirements.' className='h-10 rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm font-normal' /></label>
      <button type='button' disabled={savingSlot} onClick={createSlot} className='mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60'>{savingSlot ? <Loader2 className='h-4 w-4 animate-spin' /> : <CalendarPlus className='h-4 w-4' />} Add slot</button>
    </div>
    <div className='mt-5 flex flex-col gap-3'>
      {loadingSlots && <div className='flex justify-center py-6'><Loader2 className='h-5 w-5 animate-spin text-primary' /></div>}
      {!loadingSlots && !slots.length && <p className='rounded-xl border border-dashed border-[#D0D5DD] px-4 py-6 text-center text-sm text-secondary-black'>No practical-assessment slots have been created yet.</p>}
      {slots.map(slot => {
        const isFull = slot.scheduled_count >= slot.capacity;
        return <div key={slot.id} className='grid gap-3 rounded-xl border border-[#EAECF0] p-4 lg:grid-cols-[1.2fr_1fr_1.3fr_auto] lg:items-center'>
          <div><p className='font-medium text-primary-black'>{new Date(slot.starts_at).toLocaleString()}</p><p className='mt-1 text-sm text-secondary-black'>{slot.location}</p>{slot.instructions && <p className='mt-1 text-xs text-secondary-black'>{slot.instructions}</p>}</div>
          <p className={`text-sm font-medium ${isFull ? "text-[#B42318]" : "text-[#027A48]"}`}>{slot.scheduled_count} / {slot.capacity} assigned</p>
          <select disabled={isFull || !slot.is_active || !candidates.length} value={selectedCandidate[String(slot.id)] || ""} onChange={event => setSelectedCandidate(current => ({ ...current, [String(slot.id)]: event.target.value }))} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm disabled:bg-[#F2F4F7]'><option value=''>{isFull ? "Slot full" : candidates.length ? "Choose a candidate" : "No candidates available"}</option>{candidates.map(application => <option key={application.id} value={application.id}>{application.applicant.name || "Candidate"} · {application.applicant.email}</option>)}</select>
          <button type='button' disabled={isFull || !slot.is_active || scheduling === String(slot.id)} onClick={() => schedule(slot)} className='inline-flex h-10 items-center justify-center rounded-lg border border-primary px-4 text-sm font-medium text-primary disabled:opacity-50'>{scheduling === String(slot.id) ? <Loader2 className='h-4 w-4 animate-spin' /> : "Assign"}</button>
        </div>;
      })}
    </div>
  </section>;
};

export default PracticalAssessmentScheduler;
