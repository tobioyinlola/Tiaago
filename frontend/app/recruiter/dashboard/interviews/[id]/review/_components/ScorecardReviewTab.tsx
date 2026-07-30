"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Printer } from "lucide-react";

import { CompetencyScore, ID, InterviewScorecard } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import { getInterviewScorecard, updateCompetencyScore } from "@/app/common/services/interview-workspace";

const scoreColor = (score: number | null) => {
  if (score === null) return "text-secondary-black";
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-amber-600";
  return "text-destructive";
};

const ScorecardRow = ({
  interviewId,
  score,
  onScored,
}: {
  interviewId: ID;
  score: CompetencyScore;
  onScored: (updated: CompetencyScore) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const evidence = (score.ai_evidence as { quote: string; strength: string }[]) || [];

  return (
    <tr className='border-b border-[#EAECF0] align-top print:break-inside-avoid'>
      <td className='py-3 pr-3'>
        <p className='text-sm font-medium text-primaryBlack'>{score.competency_name}</p>
        <span className='text-[10px] text-secondary-black'>{score.required ? "Required" : "Optional"}</span>
      </td>
      <td className='py-3 pr-3'>
        <input
          type='number'
          min={0}
          max={10}
          value={score.score_raw ?? ""}
          onChange={e => {
            const value = e.target.value === "" ? null : Number(e.target.value);
            if (value !== null) updateCompetencyScore(interviewId, score.id, { score_raw: value }).then(res => {
              if (res.success) onScored(res.data);
            });
          }}
          className='input input-xs input-bordered w-16 text-sm'
        />
      </td>
      <td className='py-3 pr-3'>
        <textarea
          defaultValue={score.recruiter_notes || ""}
          onBlur={e => updateCompetencyScore(interviewId, score.id, { recruiter_notes: e.target.value }).then(res => {
            if (res.success) onScored(res.data);
          })}
          rows={2}
          className='textarea textarea-bordered textarea-xs w-full text-xs print:hidden'
        />
      </td>
      <td className='py-3 print:hidden'>
        {!!evidence.length && (
          <button
            type='button'
            onClick={() => setExpanded(prev => !prev)}
            className='flex items-center gap-1 text-xs text-primary'
          >
            {evidence.length} quote{evidence.length === 1 ? "" : "s"}
            {expanded ? <ChevronUp className='w-3 h-3' /> : <ChevronDown className='w-3 h-3' />}
          </button>
        )}
        {expanded && (
          <div className='flex flex-col gap-1 mt-2 max-w-[220px]'>
            {evidence.map((e, i) => (
              <p key={i} className='text-[11px] text-secondary-black italic border-l-2 border-[#EAECF0] pl-2'>
                &ldquo;{e.quote}&rdquo;
              </p>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
};

const ScorecardReviewTab = ({ interviewId }: { interviewId: ID }) => {
  const [scorecard, setScorecard] = useState<InterviewScorecard | null>(null);

  useEffect(() => {
    getInterviewScorecard(interviewId).then(res => {
      if (res.success) setScorecard(res.data);
    });
  }, [interviewId]);

  const handleScored = (updated: CompetencyScore) => {
    setScorecard(prev => (prev ? { ...prev, competencies: prev.competencies.map(c => (c.id === updated.id ? updated : c)) } : prev));
  };

  if (!scorecard) {
    return <p className='text-sm text-secondary-black'>Loading scorecard...</p>;
  }

  return (
    <div className='max-w-3xl flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <p className={cn("text-2xl font-bold", scoreColor(scorecard.overall_score))}>
          {scorecard.overall_score ?? "--"}
          <span className='text-sm text-secondary-black font-normal'> / 100</span>
        </p>
        <button
          type='button'
          onClick={() => window.print()}
          className='btn btn-sm btn-outline rounded-lg gap-1.5 print:hidden'
        >
          <Printer className='w-3.5 h-3.5' /> Print
        </button>
      </div>

      <div className='bg-white border border-[#EAECF0] rounded-2lg p-5 overflow-x-auto'>
        <table className='w-full'>
          <thead>
            <tr className='text-left text-[11px] font-medium text-secondary-black uppercase tracking-wide border-b border-[#EAECF0]'>
              <th className='pb-2 pr-3'>Competency</th>
              <th className='pb-2 pr-3'>Score</th>
              <th className='pb-2 pr-3'>Notes</th>
              <th className='pb-2 print:hidden'>AI evidence</th>
            </tr>
          </thead>
          <tbody>
            {scorecard.competencies.map(c => (
              <ScorecardRow key={c.id} interviewId={interviewId} score={c} onScored={handleScored} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScorecardReviewTab;
