"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, X } from "lucide-react";

import { ID, InterviewReview, InterviewSummaryConcern } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import { regenerateInterviewSummary, updateInterviewSummary } from "@/app/common/services/interview-review";
import { getInterviewReview } from "@/app/common/services/interview-review";
import CandidateFeedbackSection from "./CandidateFeedbackSection";

const SEVERITY_COLOR: Record<InterviewSummaryConcern["severity"], string> = {
  LOW: "bg-[#F5F6F7] text-secondary-black",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-destructive/10 text-destructive",
};

const EditableList = ({
  title,
  items,
  onChange,
  placeholder,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) => (
  <div>
    <p className='text-xs font-semibold text-secondary-black uppercase tracking-wide mb-2'>{title}</p>
    <div className='flex flex-col gap-1.5'>
      {items.map((item, i) => (
        <div key={i} className='flex items-center gap-2'>
          <input
            value={item}
            onChange={e => onChange(items.map((it, idx) => (idx === i ? e.target.value : it)))}
            className='input input-sm input-bordered flex-1 text-sm'
          />
          <button type='button' onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
            <X className='w-3.5 h-3.5 text-secondary-black' />
          </button>
        </div>
      ))}
      <button
        type='button'
        onClick={() => onChange([...items, ""])}
        className='flex items-center gap-1 text-xs text-primary w-fit'
      >
        <Plus className='w-3 h-3' /> {placeholder}
      </button>
    </div>
  </div>
);

const SummaryTab = ({
  interviewId,
  review,
  onReviewChange,
}: {
  interviewId: ID;
  review: InterviewReview;
  onReviewChange: (review: InterviewReview) => void;
}) => {
  const summary = review.summary;
  const [executiveSummary, setExecutiveSummary] = useState(summary?.executive_summary || "");
  const [strengths, setStrengths] = useState<string[]>(summary?.strengths || []);
  const [concerns, setConcerns] = useState<InterviewSummaryConcern[]>(summary?.concerns || []);
  const [actionItems, setActionItems] = useState<string[]>(summary?.action_items || []);
  const [previousSummary, setPreviousSummary] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await updateInterviewSummary(interviewId, {
      executive_summary: executiveSummary,
      strengths,
      concerns,
      action_items: actionItems,
    });
    setSaving(false);
    if (res.success) onReviewChange({ ...review, summary: res.data });
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setPreviousSummary(executiveSummary);
    const res = await regenerateInterviewSummary(interviewId);
    if (!res.success) {
      setRegenerating(false);
      toast.error(res.error);
      return;
    }
    // Regeneration runs async on the backend -- poll the review endpoint
    // until generation_status settles.
    const poll = async () => {
      const result = await getInterviewReview(interviewId);
      if (!result.success) return;
      if (result.data.summary?.generation_status === "GENERATING") {
        setTimeout(poll, 2000);
        return;
      }
      setRegenerating(false);
      onReviewChange(result.data);
      setExecutiveSummary(result.data.summary?.executive_summary || "");
      setStrengths(result.data.summary?.strengths || []);
      setConcerns(result.data.summary?.concerns || []);
      setActionItems(result.data.summary?.action_items || []);
    };
    setTimeout(poll, 2000);
  };

  if (!summary || summary.generation_status === "FAILED") {
    return (
      <div className='max-w-2xl flex flex-col gap-6'>
        <div className='bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800'>
          The AI summary couldn&apos;t be generated for this interview. You can write one manually below, or try
          regenerating.
        </div>
        <button
          type='button'
          onClick={handleRegenerate}
          disabled={regenerating}
          className='btn btn-sm btn-outline rounded-lg w-fit gap-1.5'
        >
          <RefreshCw className={cn("w-3.5 h-3.5", regenerating && "animate-spin")} />
          {regenerating ? "Generating..." : "Try again"}
        </button>
        <textarea
          value={executiveSummary}
          onChange={e => setExecutiveSummary(e.target.value)}
          onBlur={save}
          rows={5}
          placeholder='Write an executive summary...'
          className='textarea textarea-bordered w-full text-sm'
        />
        <CandidateFeedbackSection
          interviewId={interviewId}
          feedback={review.feedback}
          hasCandidateEmail={review.has_candidate_email}
          candidateName={review.candidate_name}
          onFeedbackChange={feedback => onReviewChange({ ...review, feedback })}
        />
      </div>
    );
  }

  return (
    <div className='max-w-2xl flex flex-col gap-6'>
      <div>
        <div className='flex items-center justify-between mb-2'>
          <p className='text-xs font-semibold text-secondary-black uppercase tracking-wide'>Executive summary</p>
          <button
            type='button'
            onClick={handleRegenerate}
            disabled={regenerating}
            className='flex items-center gap-1 text-xs text-primary'
          >
            <RefreshCw className={cn("w-3 h-3", regenerating && "animate-spin")} />
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
        <textarea
          value={executiveSummary}
          onChange={e => setExecutiveSummary(e.target.value)}
          onBlur={save}
          rows={4}
          className='textarea textarea-bordered w-full text-sm'
        />
        {previousSummary && !regenerating && previousSummary !== executiveSummary && (
          <div className='mt-2 bg-[#F8FAFC] border border-[#EAECF0] rounded-lg p-3'>
            <p className='text-[11px] font-medium text-secondary-black uppercase tracking-wide mb-1'>
              Previous version
            </p>
            <p className='text-xs text-secondary-black'>{previousSummary}</p>
          </div>
        )}
      </div>

      <EditableList title='Strengths' items={strengths} onChange={v => { setStrengths(v); }} placeholder='Add strength' />

      <div>
        <p className='text-xs font-semibold text-secondary-black uppercase tracking-wide mb-2'>Concerns</p>
        <div className='flex flex-col gap-1.5'>
          {concerns.map((concern, i) => (
            <div key={i} className='flex items-center gap-2'>
              <input
                value={concern.text}
                onChange={e =>
                  setConcerns(concerns.map((c, idx) => (idx === i ? { ...c, text: e.target.value } : c)))
                }
                className='input input-sm input-bordered flex-1 text-sm'
              />
              <select
                value={concern.severity}
                onChange={e =>
                  setConcerns(
                    concerns.map((c, idx) =>
                      idx === i ? { ...c, severity: e.target.value as InterviewSummaryConcern["severity"] } : c
                    )
                  )
                }
                className={cn("text-xs font-medium rounded-md px-2 py-1 border-none", SEVERITY_COLOR[concern.severity])}
              >
                <option value='LOW'>Low</option>
                <option value='MEDIUM'>Medium</option>
                <option value='HIGH'>High</option>
              </select>
              <button type='button' onClick={() => setConcerns(concerns.filter((_, idx) => idx !== i))}>
                <X className='w-3.5 h-3.5 text-secondary-black' />
              </button>
            </div>
          ))}
          <button
            type='button'
            onClick={() => setConcerns([...concerns, { text: "", severity: "MEDIUM" }])}
            className='flex items-center gap-1 text-xs text-primary w-fit'
          >
            <Plus className='w-3 h-3' /> Add concern
          </button>
        </div>
      </div>

      <EditableList title='Action items' items={actionItems} onChange={v => { setActionItems(v); }} placeholder='Add action item' />

      <button type='button' onClick={save} disabled={saving} className='btn btn-sm btn-primary text-white rounded-lg w-fit'>
        {saving ? "Saving..." : "Save changes"}
      </button>

      <CandidateFeedbackSection
        interviewId={interviewId}
        feedback={review.feedback}
        hasCandidateEmail={review.has_candidate_email}
        candidateName={review.candidate_name}
        onFeedbackChange={feedback => onReviewChange({ ...review, feedback })}
      />
    </div>
  );
};

export default SummaryTab;
