"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Minus, Plus, Star } from "lucide-react";

import { CompetencyScore, ID, InterviewScorecard } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import {
  getInterviewScorecard,
  submitInterviewScorecard,
  updateCompetencyScore,
} from "@/app/common/services/interview-workspace";

const scoreColor = (score: number | null) => {
  if (score === null) return "text-secondary-black";
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-amber-600";
  return "text-destructive";
};

const CompetencyCard = ({
  interviewId,
  score,
  onScored,
}: {
  interviewId: ID;
  score: CompetencyScore;
  onScored: (updated: CompetencyScore) => void;
}) => {
  const [rawValue, setRawValue] = useState<number | null>(score.score_raw);
  const [notes, setNotes] = useState(score.recruiter_notes || "");
  const [saving, setSaving] = useState(false);

  const commitScore = async (value: number) => {
    setRawValue(value);
    setSaving(true);
    const res = await updateCompetencyScore(interviewId, score.id, { score_raw: value });
    setSaving(false);
    if (res.success) onScored(res.data);
  };

  const commitNotes = async () => {
    if (notes === (score.recruiter_notes || "")) return;
    const res = await updateCompetencyScore(interviewId, score.id, { recruiter_notes: notes });
    if (res.success) onScored(res.data);
  };

  return (
    <div className='bg-white border border-[#EAECF0] rounded-xl p-4 flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <p className='text-sm font-semibold text-primaryBlack'>{score.competency_name}</p>
        <span
          className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded-full",
            score.required ? "bg-primary/10 text-primary" : "bg-[#F5F6F7] text-secondary-black"
          )}
        >
          {score.required ? "Required" : "Optional"}
        </span>
      </div>

      {score.score_type === "NUMERIC" && (
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={() => commitScore(Math.max(0, (rawValue ?? 0) - 1))}
            className='btn btn-circle btn-xs'
          >
            <Minus className='w-3 h-3' />
          </button>
          <span className='text-lg font-semibold text-primaryBlack w-8 text-center'>{rawValue ?? "--"}</span>
          <button
            type='button'
            onClick={() => commitScore(Math.min(10, (rawValue ?? 0) + 1))}
            className='btn btn-circle btn-xs'
          >
            <Plus className='w-3 h-3' />
          </button>
          <span className='text-xs text-secondary-black'>/ 10</span>
        </div>
      )}

      {score.score_type === "STAR" && (
        <div className='flex items-center gap-1'>
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} type='button' onClick={() => commitScore(star)} aria-label={`${star} stars`}>
              <Star
                className={cn(
                  "w-5 h-5",
                  (rawValue ?? 0) >= star ? "fill-amber-400 text-amber-400" : "text-gray-300"
                )}
              />
            </button>
          ))}
        </div>
      )}

      {score.score_type === "PASS_FAIL" && (
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => commitScore(1)}
            className={cn("btn btn-sm flex-1 rounded-lg", rawValue === 1 ? "!bg-success !text-white border-none" : "btn-outline")}
          >
            Pass
          </button>
          <button
            type='button'
            onClick={() => commitScore(0)}
            className={cn("btn btn-sm flex-1 rounded-lg", rawValue === 0 ? "!bg-destructive !text-white border-none" : "btn-outline")}
          >
            Fail
          </button>
        </div>
      )}

      {score.score_type === "PERCENT" && (
        <div className='flex items-center gap-3'>
          <input
            type='range'
            min={0}
            max={100}
            value={rawValue ?? 0}
            onChange={e => commitScore(Number(e.target.value))}
            className='range range-primary range-xs flex-1'
          />
          <span className='text-sm font-medium text-primaryBlack w-10 text-right'>{rawValue ?? 0}%</span>
        </div>
      )}

      {score.ai_suggested_score !== null && (
        <button
          type='button'
          onClick={() => commitScore(score.ai_suggested_score as number)}
          className='text-xs text-primary bg-primary/5 hover:bg-primary/10 rounded-md px-2 py-1 w-fit'
        >
          AI suggests: {score.ai_suggested_score}
        </button>
      )}

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={commitNotes}
        placeholder='Notes...'
        rows={2}
        className='textarea textarea-bordered textarea-sm w-full'
      />
      {saving && <span className='text-[10px] text-secondary-black'>Saving...</span>}
    </div>
  );
};

const ScorecardDrawer = ({
  interviewId,
  open,
  onToggle,
}: {
  interviewId: ID;
  open: boolean;
  onToggle: () => void;
}) => {
  const [scorecard, setScorecard] = useState<InterviewScorecard | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    if (!open || scorecard) return;
    getInterviewScorecard(interviewId).then(res => {
      if (res.success) setScorecard(res.data);
    });
  }, [open, scorecard, interviewId]);

  const handleScored = (updated: CompetencyScore) => {
    setScorecard(prev => {
      if (!prev) return prev;
      const competencies = prev.competencies.map(c => (c.id === updated.id ? updated : c));
      const scored = competencies.filter(c => c.score_normalised !== null);
      const totalWeight = scored.reduce((sum, c) => sum + c.weight, 0) || 1;
      const overall = scored.length
        ? scored.reduce((sum, c) => sum + (c.score_normalised as number) * c.weight, 0) / totalWeight
        : null;
      return {
        ...prev,
        competencies,
        scored_count: scored.length,
        overall_score: overall !== null ? Math.round(overall * 10) / 10 : null,
      };
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setMissing([]);
    const res = await submitInterviewScorecard(interviewId);
    setSubmitting(false);
    if (res.success) {
      toast.success("Scorecard submitted");
      return;
    }
    if (res.missing?.length) {
      setMissing(res.missing);
    } else {
      toast.error(res.error);
    }
  };

  const scoredCount = scorecard?.scored_count ?? 0;
  const totalCount = scorecard?.total_count ?? 0;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-white border-t border-[#EAECF0] shadow-2xl z-40 transition-[height] duration-300 ease-out flex flex-col",
        open ? "h-[45vh]" : "h-12"
      )}
    >
      <button
        type='button'
        onClick={onToggle}
        className='h-12 shrink-0 bg-deep-blue flex items-center justify-between px-4'
      >
        <span className='text-white text-sm font-medium'>
          Competency Scorecard — {scoredCount} of {totalCount} scored
        </span>
        {open ? <ChevronDown className='w-4 h-4 text-white' /> : <ChevronUp className='w-4 h-4 text-white' />}
      </button>

      {open && (
        <div className='flex-1 min-h-0 overflow-y-auto p-4'>
          <div className='flex items-center justify-between mb-4'>
            <p className='text-sm font-semibold text-primaryBlack'>Competency Scorecard</p>
            <span className={cn("text-2xl font-bold", scoreColor(scorecard?.overall_score ?? null))}>
              {scorecard?.overall_score ?? "--"}
              <span className='text-sm text-secondary-black font-normal'> / 100</span>
            </span>
          </div>

          {!!missing.length && (
            <div className='bg-destructive/5 border border-destructive/20 text-destructive text-sm rounded-lg p-3 mb-4'>
              Please score: {missing.join(", ")} before submitting
            </div>
          )}

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {scorecard?.competencies.map(c => (
              <CompetencyCard key={c.id} interviewId={interviewId} score={c} onScored={handleScored} />
            ))}
          </div>

          <button
            type='button'
            onClick={handleSubmit}
            disabled={submitting}
            className='btn btn-primary text-white rounded-lg w-full mt-5'
          >
            {submitting ? "Submitting..." : "Submit Scorecard"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ScorecardDrawer;
