"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { JobApplication, WorkSampleRubricCriterion } from "@/app/common/types";
import { reviewApplicationScenarioResponse, WorkSampleReviewDecision } from "@/app/common/services/jobs";

type Draft = { status?: WorkSampleReviewDecision; reason: string; scores: Record<string, string>; scoreNotes: Record<string, string> };
const reviewable = new Set(["SUBMITTED", "NEEDS_REVIEW"]);

const ScenarioReviewQueue = ({ initialApplications }: { initialApplications: JobApplication[] }) => {
  const [applications, setApplications] = useState(initialApplications);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (application: JobApplication, criteria: WorkSampleRubricCriterion[], passingScore: number) => {
    const scenario = application.scenario_response;
    if (!scenario) return;
    const draft = drafts[String(scenario.id)];
    if (!draft?.status || draft.status === "SUBMITTED") return toast.error("Select a review decision");
    if (["FAIL", "NEEDS_REVIEW"].includes(draft.status) && !draft.reason.trim()) return toast.error("Add a review reason");
    let scores: Record<string, number> | undefined;
    if (criteria.length && ["PASS", "FAIL"].includes(draft.status)) {
      const missing = criteria.some((criterion, index) => !Object.prototype.hasOwnProperty.call(draft.scores, criterion.code || `criterion-${index + 1}`) || draft.scores[criterion.code || `criterion-${index + 1}`] === "");
      if (missing) return toast.error("Score every criterion before recording a final decision");
      scores = Object.fromEntries(criteria.map((criterion, index) => [criterion.code || `criterion-${index + 1}`, Number(draft.scores[criterion.code || `criterion-${index + 1}`])]));
      const weighted = criteria.reduce((total, criterion, index) => total + ((scores![criterion.code || `criterion-${index + 1}`] / 5) * criterion.weight), 0);
      if (draft.status === "PASS" && weighted < passingScore) return toast.error(`This response scored ${weighted.toFixed(1)}%, below the ${passingScore}% passing score`);
    }
    setSaving(String(scenario.id));
    const result = await reviewApplicationScenarioResponse(application.id, scenario.id, draft.status, draft.reason, scores, scores ? draft.scoreNotes : undefined);
    setSaving(null);
    if (!result.success) return toast.error(result.error || "Could not save the review");
    if (!result.data) return toast.error("Could not save the review");
    setApplications(current => current.map(item => item.id === application.id ? { ...item, scenario_response: result.data! } : item).filter(item => item.scenario_response && reviewable.has(item.scenario_response.status)));
    toast.success("Scenario review saved");
  };

  if (!applications.length) return <div className='rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-14 text-center text-secondary-black'>No scenario responses are waiting for review.</div>;
  return <div className='flex flex-col gap-4'>{applications.map(application => {
    const scenario = application.scenario_response;
    if (!scenario || !reviewable.has(scenario.status)) return null;
    const rubric = application.job.scenario_configuration?.rubric;
    const criteria = rubric?.criteria || [];
    const passingScore = rubric?.passing_score ?? 60;
    const draft = drafts[String(scenario.id)] || { reason: "", scores: {}, scoreNotes: {} };
    const complete = criteria.length && criteria.every((criterion, index) => Object.prototype.hasOwnProperty.call(draft.scores, criterion.code || `criterion-${index + 1}`) && draft.scores[criterion.code || `criterion-${index + 1}`] !== "");
    const weightedScore = complete ? criteria.reduce((total, criterion, index) => total + ((Number(draft.scores[criterion.code || `criterion-${index + 1}`]) / 5) * criterion.weight), 0) : null;
    const update = (change: Partial<Draft>) => setDrafts(current => ({ ...current, [String(scenario.id)]: { ...draft, ...change } }));
    return <section key={application.id} className='rounded-2xl border border-[#EAECF0] bg-white p-5 shadow-sm'>
      <div className='flex flex-wrap justify-between gap-3 border-b border-[#EAECF0] pb-4'><div><h2 className='font-semibold text-primary-black'>{application.applicant.name || "Candidate"}</h2><p className='text-sm text-secondary-black'>{application.applicant.email}</p></div><p className='text-sm font-medium text-primary-black'>{application.job.title}</p></div>
      <div className='mt-4 rounded-xl bg-[#F9FAFB] p-4'><p className='whitespace-pre-wrap text-sm leading-6 text-primary-black'>{scenario.response}</p></div>
      {!!criteria.length && <div className='mt-4 rounded-lg border border-[#EAECF0] bg-[#FCFCFD] p-3'><div className='flex flex-wrap justify-between gap-2'><p className='text-sm font-semibold text-primary-black'>Scorecard</p><p className='text-xs text-secondary-black'>Pass: {passingScore}%{weightedScore !== null ? ` · Current: ${weightedScore.toFixed(1)}%` : ""}</p></div><div className='mt-3 flex flex-col gap-2'>{criteria.map((criterion, index) => { const code = criterion.code || `criterion-${index + 1}`; return <div key={code} className='grid gap-2 rounded-lg border border-[#EAECF0] bg-white p-3 md:grid-cols-[1fr_100px_1fr] md:items-end'><div><p className='text-sm font-medium text-primary-black'>{criterion.label} <span className='font-normal text-secondary-black'>({criterion.weight}%)</span></p>{criterion.description && <p className='mt-1 text-xs text-secondary-black'>{criterion.description}</p>}</div><label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Score (0–5)<select value={draft.scores[code] ?? ""} onChange={event => update({ scores: { ...draft.scores, [code]: event.target.value } })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal'><option value=''>Select</option>{[0,1,2,3,4,5].map(score => <option key={score} value={score}>{score}</option>)}</select></label><label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Reviewer note <span className='font-normal text-secondary-black'>(optional)</span><input value={draft.scoreNotes[code] || ""} maxLength={1000} onChange={event => update({ scoreNotes: { ...draft.scoreNotes, [code]: event.target.value } })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' /></label></div>; })}</div></div>}
      <div className='mt-4 grid gap-3 md:grid-cols-[1fr_200px_auto] md:items-end'><input value={draft.reason} maxLength={1000} onChange={event => update({ reason: event.target.value })} placeholder='Review reason (required for changes or decline)' className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm' /><select value={draft.status || ""} onChange={event => update({ status: event.target.value as WorkSampleReviewDecision })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm'><option value=''>Decision</option><option value='PASS'>Accept</option><option value='NEEDS_REVIEW'>Request changes</option><option value='FAIL'>Do not accept</option></select><button type='button' disabled={saving === String(scenario.id)} onClick={() => save(application, criteria, passingScore)} className='inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60'>{saving === String(scenario.id) ? <Loader2 className='h-4 w-4 animate-spin' /> : "Save review"}</button></div>
    </section>;
  })}</div>;
};

export default ScenarioReviewQueue;
