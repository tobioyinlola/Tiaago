"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ApplicationWorkSample, JobApplication } from "@/app/common/types";
import { reviewApplicationWorkSample, WorkSampleReviewDecision } from "@/app/common/services/jobs";

const reviewable = new Set<ApplicationWorkSample["status"]>(["SUBMITTED", "NEEDS_REVIEW"]);

const WorkSampleReviewQueue = ({ initialApplications }: { initialApplications: JobApplication[] }) => {
  const [applications, setApplications] = useState(initialApplications);
  const [drafts, setDrafts] = useState<Record<string, { status?: WorkSampleReviewDecision; reason: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (application: JobApplication, sample: ApplicationWorkSample) => {
    const draft = drafts[String(sample.id)];
    if (!draft?.status || draft.status === "SUBMITTED") return toast.error("Select a review decision");
    if (["FAIL", "NEEDS_REVIEW"].includes(draft.status) && !draft.reason.trim()) return toast.error("Add a review reason");
    setSaving(String(sample.id));
    const response = await reviewApplicationWorkSample(application.id, sample.id, draft.status, draft.reason);
    setSaving(null);
    if (!response.success) return toast.error(response.error || "Could not save the review");
    if (!response.data) return toast.error("Could not save the review");
    setApplications(current => current.map(item => item.id !== application.id ? item : {
      ...item,
      work_samples: (item.work_samples || []).map(existing => existing.id === sample.id ? response.data! : existing),
    }).filter(item => (item.work_samples || []).some(sample => reviewable.has(sample.status))));
    toast.success("Work-sample review saved");
  };

  if (!applications.length) return <div className='rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-14 text-center text-secondary-black'>No work samples are waiting for review.</div>;

  return <div className='flex flex-col gap-4'>{applications.map(application => (
    <section key={application.id} className='rounded-2xl border border-[#EAECF0] bg-white p-5 shadow-sm'>
      <div className='flex flex-wrap justify-between gap-3 border-b border-[#EAECF0] pb-4'>
        <div><h2 className='font-semibold text-primary-black'>{application.applicant.name || "Candidate"}</h2><p className='text-sm text-secondary-black'>{application.applicant.email}</p></div>
        <p className='text-sm font-medium text-primary-black'>{application.job.title}</p>
      </div>
      {(application.work_samples || []).filter(sample => reviewable.has(sample.status)).map(sample => {
        const draft = drafts[String(sample.id)] || { reason: "" };
        const isSaving = saving === String(sample.id);
        return <div key={sample.id} className='mt-4 grid gap-3 rounded-xl border border-[#EAECF0] p-4 md:grid-cols-[1fr_200px_1fr_auto] md:items-end'>
          <div><p className='font-medium text-primary-black'>{sample.original_filename}</p><a className='mt-2 inline-flex items-center gap-1 text-sm text-primary underline' href={`/api/work-samples/${application.id}/${sample.id}`}><FileDown className='h-4 w-4' /> Download private sample</a></div>
          <select value={draft.status || ""} onChange={event => setDrafts(current => ({ ...current, [String(sample.id)]: { ...draft, status: event.target.value as WorkSampleReviewDecision } }))} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm'><option value=''>Decision</option><option value='PASS'>Accept</option><option value='NEEDS_REVIEW'>Request changes</option><option value='FAIL'>Do not accept</option></select>
          <input value={draft.reason} maxLength={1000} onChange={event => setDrafts(current => ({ ...current, [String(sample.id)]: { ...draft, reason: event.target.value } }))} placeholder='Review reason' className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm' />
          <button type='button' disabled={isSaving} onClick={() => save(application, sample)} className='inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60'>{isSaving ? <Loader2 className='h-4 w-4 animate-spin' /> : "Save review"}</button>
        </div>;
      })}
    </section>
  ))}</div>;
};

export default WorkSampleReviewQueue;
