"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ApplicationReadiness, ReadinessStatus } from "@/app/common/types";
import { updateApplicationReadiness } from "@/app/common/services/jobs";

type Draft = { readiness_status: Exclude<ReadinessStatus, "NOT_STARTED">; readiness_target_start_date: string; readiness_note: string };

const STATUS_LABELS: Record<Exclude<ReadinessStatus, "NOT_STARTED">, string> = {
  CHECKS_OUTSTANDING: "Checks outstanding",
  READY_TO_START: "Ready to start",
  STARTED: "Started",
};

const ReadinessQueue = ({ initialApplications }: { initialApplications: ApplicationReadiness[] }) => {
  const [applications, setApplications] = useState(initialApplications);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (application: ApplicationReadiness) => {
    const draft = drafts[String(application.id)] || {
      readiness_status: application.readiness_status === "NOT_STARTED" ? "CHECKS_OUTSTANDING" : application.readiness_status,
      readiness_target_start_date: application.readiness_target_start_date || "",
      readiness_note: application.readiness_note || "",
    };
    if (["READY_TO_START", "STARTED"].includes(draft.readiness_status) && !draft.readiness_target_start_date) {
      return toast.error("Set the agreed start date before marking this candidate ready or started");
    }
    if (draft.readiness_status === "CHECKS_OUTSTANDING" && !draft.readiness_note.trim()) {
      return toast.error("Record the next readiness action or outstanding item");
    }
    setSaving(String(application.id));
    const result = await updateApplicationReadiness(application.id, {
      readiness_status: draft.readiness_status,
      readiness_target_start_date: draft.readiness_target_start_date || null,
      readiness_note: draft.readiness_note,
    });
    setSaving(null);
    if (!result.success) return toast.error(result.error || "Could not save readiness");
    if (!result.data) return toast.error("Could not save readiness");
    setApplications(current => current.map(item => item.id === application.id ? result.data! : item));
    setDrafts(current => ({ ...current, [String(application.id)]: {
      readiness_status: result.data!.readiness_status === "NOT_STARTED" ? "CHECKS_OUTSTANDING" : result.data!.readiness_status,
      readiness_target_start_date: result.data!.readiness_target_start_date || "",
      readiness_note: result.data!.readiness_note || "",
    } }));
    toast.success(result.data.readiness_status === "STARTED" ? "Start recorded" : "Readiness updated");
  };

  if (!applications.length) return <div className='rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-14 text-center text-secondary-black'>No accepted offers are in the readiness queue.</div>;
  return <div className='flex flex-col gap-4'>{applications.map(application => {
    const draft = drafts[String(application.id)] || {
      readiness_status: application.readiness_status === "NOT_STARTED" ? "CHECKS_OUTSTANDING" : application.readiness_status,
      readiness_target_start_date: application.readiness_target_start_date || "",
      readiness_note: application.readiness_note || "",
    };
    const update = (change: Partial<Draft>) => setDrafts(current => ({ ...current, [String(application.id)]: { ...draft, ...change } }));
    const started = application.readiness_status === "STARTED";
    return <section key={application.id} className='rounded-2xl border border-[#EAECF0] bg-white p-5 shadow-sm'>
      <div className='flex flex-wrap justify-between gap-3 border-b border-[#EAECF0] pb-4'><div><h2 className='font-semibold text-primary-black'>{application.candidate_name || "Candidate"}</h2><p className='text-sm text-secondary-black'>{application.candidate_email}</p></div><div className='text-right'><p className='text-sm font-medium text-primary-black'>{application.job_title}</p><p className='mt-1 text-xs text-secondary-black'>{STATUS_LABELS[application.readiness_status === "NOT_STARTED" ? "CHECKS_OUTSTANDING" : application.readiness_status]}</p></div></div>
      {application.blocker_detail && <div className='mt-4 rounded-lg bg-[#FFFAEB] px-3 py-2 text-sm text-[#B54708]'>{application.blocker_detail}</div>}
      <div className='mt-4 grid gap-3 md:grid-cols-[1fr_180px_170px_auto] md:items-end'><label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Next action / note<textarea disabled={started} value={draft.readiness_note} maxLength={1200} onChange={event => update({ readiness_note: event.target.value })} className='min-h-10 rounded-lg border border-[#D0D5DD] p-3 text-sm font-normal disabled:bg-[#F2F4F7]' /></label><label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Agreed start date<input disabled={started} type='date' value={draft.readiness_target_start_date} onChange={event => update({ readiness_target_start_date: event.target.value })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal disabled:bg-[#F2F4F7]' /></label><label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Readiness state<select disabled={started} value={draft.readiness_status} onChange={event => update({ readiness_status: event.target.value as Draft["readiness_status"] })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm disabled:bg-[#F2F4F7]'>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type='button' disabled={started || saving === String(application.id)} onClick={() => save(application)} className='inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60'>{saving === String(application.id) ? <Loader2 className='h-4 w-4 animate-spin' /> : started ? "Start recorded" : "Save"}</button></div>
      {application.updated_by_name && <p className='mt-3 text-xs text-secondary-black'>Last updated by {application.updated_by_name}{application.readiness_updated_at ? ` · ${new Date(application.readiness_updated_at).toLocaleString()}` : ""}</p>}
    </section>;
  })}</div>;
};

export default ReadinessQueue;
