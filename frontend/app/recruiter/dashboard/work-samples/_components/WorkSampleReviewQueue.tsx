"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ApplicationWorkSample, JobApplication, WorkSampleRubricCriterion } from "@/app/common/types";
import { reviewApplicationWorkSample, WorkSampleReviewDecision } from "@/app/common/services/jobs";

const scanMessages: Record<ApplicationWorkSample["scan_status"], string> = {
  PENDING: "Scanning for malware – download will unlock when the scan finishes.",
  CLEAN: "",
  INFECTED: "Blocked: malware was detected and the file was removed. Do not accept; decline this sample.",
  ERROR: "The malware scan could not be completed. The file stays locked until it is rescanned.",
};

const reviewable = new Set<ApplicationWorkSample["status"]>(["SUBMITTED", "NEEDS_REVIEW"]);

type ReviewDraft = {
  status?: WorkSampleReviewDecision;
  reason: string;
  scores: Record<string, string>;
  scoreNotes: Record<string, string>;
};

const WorkSampleReviewQueue = ({ initialApplications }: { initialApplications: JobApplication[] }) => {
  const [applications, setApplications] = useState(initialApplications);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (application: JobApplication, sample: ApplicationWorkSample, criteria: WorkSampleRubricCriterion[], passingScore: number) => {
    const draft = drafts[String(sample.id)];
    if (!draft?.status || draft.status === "SUBMITTED") return toast.error("Select a review decision");
    if (["FAIL", "NEEDS_REVIEW"].includes(draft.status) && !draft.reason.trim()) return toast.error("Add a review reason");

    let scores: Record<string, number> | undefined;
    if (criteria.length && ["PASS", "FAIL"].includes(draft.status)) {
      const missingScore = criteria.some((criterion, index) => draft.scores[criterion.code || `criterion-${index + 1}`] === undefined || draft.scores[criterion.code || `criterion-${index + 1}`] === "");
      if (missingScore) return toast.error("Score every criterion before recording a final decision");
      scores = Object.fromEntries(criteria.map((criterion, index) => [
        criterion.code || `criterion-${index + 1}`,
        Number(draft.scores[criterion.code || `criterion-${index + 1}`]),
      ]));
      const weightedScore = criteria.reduce((total, criterion, index) => total + ((scores![criterion.code || `criterion-${index + 1}`] / 5) * criterion.weight), 0);
      if (draft.status === "PASS" && weightedScore < passingScore) return toast.error(`This sample scored ${weightedScore.toFixed(1)}%, below the ${passingScore}% passing score`);
    }

    setSaving(String(sample.id));
    const response = await reviewApplicationWorkSample(
      application.id,
      sample.id,
      draft.status,
      draft.reason,
      scores,
      scores ? draft.scoreNotes : undefined,
    );
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

  return <div className='flex flex-col gap-4'>{applications.map(application => {
    const rubric = application.job.work_sample_configuration?.rubric;
    const criteria = rubric?.criteria || [];
    const passingScore = rubric?.passing_score ?? 60;
    return <section key={application.id} className='rounded-2xl border border-[#EAECF0] bg-white p-5 shadow-sm'>
      <div className='flex flex-wrap justify-between gap-3 border-b border-[#EAECF0] pb-4'>
        <div><h2 className='font-semibold text-primary-black'>{application.applicant.name || "Candidate"}</h2><p className='text-sm text-secondary-black'>{application.applicant.email}</p></div>
        <p className='text-sm font-medium text-primary-black'>{application.job.title}</p>
      </div>
      {(application.work_samples || []).filter(sample => reviewable.has(sample.status)).map(sample => {
        const draft = drafts[String(sample.id)] || { reason: "", scores: {}, scoreNotes: {} };
        const isSaving = saving === String(sample.id);
        const weightedScore = criteria.length && criteria.every((criterion, index) => draft.scores[criterion.code || `criterion-${index + 1}`] !== undefined && draft.scores[criterion.code || `criterion-${index + 1}`] !== "")
          ? criteria.reduce((total, criterion, index) => total + ((Number(draft.scores[criterion.code || `criterion-${index + 1}`]) / 5) * criterion.weight), 0)
          : null;
        const updateDraft = (change: Partial<ReviewDraft>) => setDrafts(current => ({ ...current, [String(sample.id)]: { ...draft, ...change } }));
        return <div key={sample.id} className='mt-4 rounded-xl border border-[#EAECF0] p-4'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div><p className='font-medium text-primary-black'>{sample.original_filename}</p>{sample.scan_status === 'CLEAN'
              ? <a className='mt-2 inline-flex items-center gap-1 text-sm text-primary underline' href={`/api/work-samples/${application.id}/${sample.id}`}><FileDown className='h-4 w-4' /> Download private sample</a>
              : <p className={`mt-2 text-sm ${sample.scan_status === 'INFECTED' ? 'font-medium text-red-600' : 'text-secondary-black'}`}>{scanMessages[sample.scan_status] || scanMessages.PENDING}</p>}</div>
            <select value={draft.status || ""} onChange={event => updateDraft({ status: event.target.value as WorkSampleReviewDecision })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm'><option value=''>Decision</option><option value='PASS'>Accept</option><option value='NEEDS_REVIEW'>Request changes</option><option value='FAIL'>Do not accept</option></select>
          </div>
          {!!criteria.length && <div className='mt-4 rounded-lg bg-[#F9FAFB] p-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'><p className='text-sm font-semibold text-primary-black'>Scorecard</p><p className='text-xs text-secondary-black'>Passing score: {passingScore}%{weightedScore !== null ? ` · Current score: ${weightedScore.toFixed(1)}%` : ""}</p></div>
            <div className='mt-3 flex flex-col gap-2'>
              {criteria.map((criterion, index) => {
                const code = criterion.code || `criterion-${index + 1}`;
                return <div key={code} className='grid gap-2 rounded-lg border border-[#EAECF0] bg-white p-3 md:grid-cols-[minmax(0,1fr)_100px_minmax(0,1fr)] md:items-end'>
                  <div><p className='text-sm font-medium text-primary-black'>{criterion.label} <span className='font-normal text-secondary-black'>({criterion.weight}%)</span></p>{criterion.description && <p className='mt-1 text-xs text-secondary-black'>{criterion.description}</p>}</div>
                  <label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Score (0–5)<select value={draft.scores[code] ?? ""} onChange={event => updateDraft({ scores: { ...draft.scores, [code]: event.target.value } })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal'><option value=''>Select</option>{[0, 1, 2, 3, 4, 5].map(score => <option key={score} value={score}>{score}</option>)}</select></label>
                  <label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Reviewer note <span className='font-normal text-secondary-black'>(optional)</span><input value={draft.scoreNotes[code] || ""} maxLength={1000} onChange={event => updateDraft({ scoreNotes: { ...draft.scoreNotes, [code]: event.target.value } })} placeholder='Evidence for this score' className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' /></label>
                </div>;
              })}
            </div>
          </div>}
          <div className='mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end'>
            <input value={draft.reason} maxLength={1000} onChange={event => updateDraft({ reason: event.target.value })} placeholder='Review reason (required for changes or decline)' className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm' />
            <button type='button' disabled={isSaving} onClick={() => save(application, sample, criteria, passingScore)} className='inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60'>{isSaving ? <Loader2 className='h-4 w-4 animate-spin' /> : "Save review"}</button>
          </div>
        </div>;
      })}
    </section>;
  })}</div>;
};

export default WorkSampleReviewQueue;
