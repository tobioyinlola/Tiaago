"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ApplicationPracticalAssessment, JobApplication, WorkSampleRubricCriterion } from "@/app/common/types";
import { createPracticalBookingLink, recordPracticalAttendance, reviewApplicationPracticalAssessment } from "@/app/common/services/jobs";

type Draft = {
  outcome?: "PASS" | "FAIL";
  observations: string;
  criticalFailure: boolean;
  criticalFailureReason: string;
  scores: Record<string, string>;
  scoreNotes: Record<string, string>;
};

const PracticalAssessmentReviewQueue = ({ initialApplications }: { initialApplications: JobApplication[] }) => {
  const [applications, setApplications] = useState(initialApplications);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (application: JobApplication, assessment: ApplicationPracticalAssessment) => {
    const draft = drafts[String(assessment.id)] || { observations: "", criticalFailure: false, criticalFailureReason: "", scores: {}, scoreNotes: {} };
    if (!draft.outcome) return toast.error("Select the assessment outcome");
    if (draft.criticalFailure && draft.outcome !== "FAIL") return toast.error("A critical failure must be recorded as a failed assessment");
    if (draft.criticalFailure && !draft.criticalFailureReason.trim()) return toast.error("Record why this was a critical failure");
    if (draft.outcome === "FAIL" && !draft.criticalFailure && !draft.observations.trim()) return toast.error("Record the assessor’s observations for a failed assessment");

    const rubric = assessment.rubric_snapshot;
    const criteria = rubric?.criteria || [];
    let scores: Record<string, number> | undefined;
    if (criteria.length && !draft.criticalFailure) {
      const missing = criteria.some((criterion, index) => {
        const code = criterion.code || `criterion-${index + 1}`;
        return !Object.prototype.hasOwnProperty.call(draft.scores, code) || draft.scores[code] === "";
      });
      if (missing) return toast.error("Score every criterion before recording this decision");
      scores = Object.fromEntries(criteria.map((criterion, index) => {
        const code = criterion.code || `criterion-${index + 1}`;
        return [code, Number(draft.scores[code])];
      }));
      const weighted = criteria.reduce((total, criterion, index) => total + ((scores![criterion.code || `criterion-${index + 1}`] / 5) * criterion.weight), 0);
      if (draft.outcome === "PASS" && weighted < rubric.passing_score) return toast.error(`This assessment scored ${weighted.toFixed(1)}%, below the ${rubric.passing_score}% passing score`);
    }

    setSaving(String(assessment.id));
    const result = await reviewApplicationPracticalAssessment(application.id, assessment.id, {
      outcome: draft.outcome,
      observations: draft.observations,
      critical_failure: draft.criticalFailure,
      critical_failure_reason: draft.criticalFailureReason,
      ...(scores ? { scores, score_notes: draft.scoreNotes } : {}),
    });
    setSaving(null);
    if (!result.success) return toast.error(result.error || "Could not save the assessment result");
    if (!result.data) return toast.error("Could not save the assessment result");
    setApplications(current => current
      .map(item => item.id === application.id
        ? { ...item, practical_assessments: (item.practical_assessments || []).filter(itemAssessment => itemAssessment.id !== assessment.id) }
        : item)
      .filter(item => (item.practical_assessments || []).length > 0));
    toast.success("Practical assessment result saved");
  };

  const removeAssessment = (applicationId: JobApplication["id"], assessmentId: ApplicationPracticalAssessment["id"]) => setApplications(current => current
    .map(item => item.id === applicationId
      ? { ...item, practical_assessments: (item.practical_assessments || []).filter(itemAssessment => itemAssessment.id !== assessmentId) }
      : item)
    .filter(item => (item.practical_assessments || []).length > 0));

  const attendance = async (application: JobApplication, assessment: ApplicationPracticalAssessment, status: "NO_SHOW" | "CANCELLED") => {
    const reason = window.prompt(status === "NO_SHOW" ? "Note for the no-show (optional)" : "Reason for cancelling (optional)");
    if (reason === null) return;
    setSaving(String(assessment.id));
    const result = await recordPracticalAttendance(application.id, assessment.id, status, reason);
    setSaving(null);
    if (!result.success) return toast.error(result.error || "Could not update the appointment");
    removeAssessment(application.id, assessment.id);
    toast.success(status === "NO_SHOW" ? "No-show recorded – the candidate has been told" : "Appointment cancelled – the candidate has been told");
  };

  const bookingLink = async (application: JobApplication) => {
    const result = await createPracticalBookingLink(application.id);
    if (!result.success) return toast.error(result.error || "Could not create the booking link");
    await navigator.clipboard?.writeText(result.data!.url).catch(() => undefined);
    toast.success(result.data!.notification_status === "SENT" ? "Booking link emailed to the candidate and copied" : "Booking link copied – we are emailing it to the candidate");
  };

  if (!applications.length) return <div className='rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-14 text-center text-secondary-black'>No practical assessments are awaiting an assessor’s decision.</div>;
  return <div className='flex flex-col gap-4'>{applications.flatMap(application => (application.practical_assessments || []).filter(assessment => assessment.status === "SCHEDULED").map(assessment => {
    const draft = drafts[String(assessment.id)] || { observations: "", criticalFailure: false, criticalFailureReason: "", scores: {}, scoreNotes: {} };
    const rubric = assessment.rubric_snapshot;
    const criteria: WorkSampleRubricCriterion[] = rubric?.criteria || [];
    const complete = criteria.length > 0 && criteria.every((criterion, index) => {
      const code = criterion.code || `criterion-${index + 1}`;
      return Object.prototype.hasOwnProperty.call(draft.scores, code) && draft.scores[code] !== "";
    });
    const weighted = complete ? criteria.reduce((total, criterion, index) => total + ((Number(draft.scores[criterion.code || `criterion-${index + 1}`]) / 5) * criterion.weight), 0) : null;
    const update = (change: Partial<Draft>) => setDrafts(current => ({ ...current, [String(assessment.id)]: { ...draft, ...change } }));
    return <section key={`${application.id}-${assessment.id}`} className='rounded-2xl border border-[#EAECF0] bg-white p-5 shadow-sm'>
      <div className='flex flex-wrap justify-between gap-3 border-b border-[#EAECF0] pb-4'><div><h2 className='font-semibold text-primary-black'>{application.applicant.name || "Candidate"}</h2><p className='text-sm text-secondary-black'>{application.applicant.email}</p></div><div className='text-right'><p className='text-sm font-medium text-primary-black'>{application.job.title}</p><p className='text-xs text-secondary-black'>Attempt {assessment.attempt_number}</p></div></div>
      <div className='mt-4 rounded-xl bg-[#F9FAFB] p-4 text-sm'><p className='font-medium text-primary-black'>{rubric ? application.job.practical_assessment_configuration?.title || "Practical assessment" : "Practical assessment"}</p><p className='mt-1 text-secondary-black'>{new Date(assessment.slot.starts_at).toLocaleString()} · {assessment.slot.location}</p>{assessment.slot.instructions && <p className='mt-2 whitespace-pre-wrap text-secondary-black'>{assessment.slot.instructions}</p>}{assessment.policy_override_reason && <p className='mt-2 text-xs text-[#B54708]'>Booked outside policy: {assessment.policy_override_reason}</p>}<div className='mt-3 flex flex-wrap gap-2'>{new Date(assessment.slot.starts_at) <= new Date() && <button type='button' disabled={saving === String(assessment.id)} onClick={() => attendance(application, assessment, "NO_SHOW")} className='h-8 rounded-lg border border-[#D0D5DD] bg-white px-3 text-xs font-medium disabled:opacity-60'>Candidate did not attend</button>}<button type='button' disabled={saving === String(assessment.id)} onClick={() => attendance(application, assessment, "CANCELLED")} className='h-8 rounded-lg border border-[#D0D5DD] bg-white px-3 text-xs font-medium disabled:opacity-60'>Cancel appointment</button><button type='button' onClick={() => bookingLink(application)} className='h-8 rounded-lg border border-[#D0D5DD] bg-white px-3 text-xs font-medium'>Send candidate booking link</button></div></div>
      {!!criteria.length && <div className='mt-4 rounded-lg border border-[#EAECF0] bg-[#FCFCFD] p-3'><div className='flex flex-wrap justify-between gap-2'><p className='text-sm font-semibold text-primary-black'>Assessor scorecard</p><p className='text-xs text-secondary-black'>Pass: {rubric.passing_score}%{weighted !== null ? ` · Current: ${weighted.toFixed(1)}%` : ""}</p></div><div className='mt-3 flex flex-col gap-2'>{criteria.map((criterion, index) => { const code = criterion.code || `criterion-${index + 1}`; return <div key={code} className='grid gap-2 rounded-lg border border-[#EAECF0] bg-white p-3 md:grid-cols-[1fr_100px_1fr] md:items-end'><div><p className='text-sm font-medium text-primary-black'>{criterion.label} <span className='font-normal text-secondary-black'>({criterion.weight}%)</span></p>{criterion.description && <p className='mt-1 text-xs text-secondary-black'>{criterion.description}</p>}</div><label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Score (0–5)<select disabled={draft.criticalFailure} value={draft.scores[code] ?? ""} onChange={event => update({ scores: { ...draft.scores, [code]: event.target.value } })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal disabled:bg-[#F2F4F7]'><option value=''>Select</option>{[0, 1, 2, 3, 4, 5].map(score => <option key={score} value={score}>{score}</option>)}</select></label><label className='flex flex-col gap-1 text-xs font-medium text-primary-black'>Assessor note <span className='font-normal text-secondary-black'>(optional)</span><input disabled={draft.criticalFailure} value={draft.scoreNotes[code] || ""} maxLength={1000} onChange={event => update({ scoreNotes: { ...draft.scoreNotes, [code]: event.target.value } })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal disabled:bg-[#F2F4F7]' /></label></div>; })}</div></div>}
      <div className='mt-4 grid gap-3 md:grid-cols-[1fr_190px]'><label className='flex flex-col gap-1 text-sm font-medium text-primary-black'>Assessor observations<textarea value={draft.observations} maxLength={2000} onChange={event => update({ observations: event.target.value })} placeholder='Record observed strengths, issues, and any follow-up.' className='min-h-20 rounded-lg border border-[#D0D5DD] p-3 text-sm font-normal' /></label><div className='flex flex-col gap-3'><label className='flex cursor-pointer items-center gap-2 text-sm font-medium text-[#B42318]'><input type='checkbox' checked={draft.criticalFailure} onChange={event => update({ criticalFailure: event.target.checked, outcome: event.target.checked ? "FAIL" : draft.outcome })} className='h-4 w-4 accent-[#B42318]' /> Critical failure</label>{draft.criticalFailure && <label className='flex flex-col gap-1 text-sm font-medium text-primary-black'>Critical-failure reason<input value={draft.criticalFailureReason} maxLength={1000} onChange={event => update({ criticalFailureReason: event.target.value })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal' /></label>}<select value={draft.outcome || ""} disabled={draft.criticalFailure} onChange={event => update({ outcome: event.target.value as Draft["outcome"] })} className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm disabled:bg-[#F2F4F7]'><option value=''>Outcome</option><option value='PASS'>Pass</option><option value='FAIL'>Fail</option></select><button type='button' disabled={saving === String(assessment.id)} onClick={() => save(application, assessment)} className='inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-60'>{saving === String(assessment.id) ? <Loader2 className='h-4 w-4 animate-spin' /> : "Record result"}</button></div></div>
    </section>;
  }))}</div>;
};

export default PracticalAssessmentReviewQueue;
