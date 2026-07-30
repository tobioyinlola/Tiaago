"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { ID, InterviewConfidenceValue, InterviewRecommendationValue, InterviewReview } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import { submitInterviewDecision } from "@/app/common/services/interview-review";
import { getInterviewScorecard } from "@/app/common/services/interview-workspace";

const RECOMMENDATIONS: { value: InterviewRecommendationValue; label: string; color: string }[] = [
  { value: "STRONG_YES", label: "Strong Yes", color: "border-success bg-success/5 text-success" },
  { value: "YES", label: "Yes", color: "border-success/60 bg-success/5 text-success" },
  { value: "MAYBE", label: "Maybe", color: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "NO", label: "No", color: "border-destructive/60 bg-destructive/5 text-destructive" },
  { value: "STRONG_NO", label: "Strong No", color: "border-destructive bg-destructive/5 text-destructive" },
];

const CONFIDENCE: InterviewConfidenceValue[] = ["LOW", "MEDIUM", "HIGH"];

const scoreColor = (score: number | null) => {
  if (score === null) return "text-secondary-black";
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-amber-600";
  return "text-destructive";
};

const DecisionPanel = ({
  interviewId,
  review,
  onReviewChange,
}: {
  interviewId: ID;
  review: InterviewReview;
  onReviewChange: (review: InterviewReview) => void;
}) => {
  const [recommendation, setRecommendation] = useState<InterviewRecommendationValue | null>(
    review.summary?.recommendation ?? null
  );
  const [confidence, setConfidence] = useState<InterviewConfidenceValue | null>(review.summary?.confidence ?? null);
  const [weightedScore, setWeightedScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getInterviewScorecard(interviewId).then(res => {
      if (res.success) setWeightedScore(res.data.overall_score);
    });
  }, [interviewId]);

  const submitted = !!review.summary?.submitted_at;

  const handleSubmit = async () => {
    if (!recommendation || !confidence) {
      toast.error("Choose a recommendation and confidence level first.");
      return;
    }
    setSubmitting(true);
    const res = await submitInterviewDecision(interviewId, {
      recommendation,
      confidence,
      overall_score: weightedScore ?? undefined,
    });
    setSubmitting(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Decision submitted");
    onReviewChange({ ...review, summary: res.data });
  };

  return (
    <aside className='w-[300px] shrink-0 bg-white border-l border-[#EAECF0] flex flex-col overflow-y-auto'>
      <div className='p-5 flex flex-col gap-5'>
        {submitted && (
          <div className='flex items-center gap-2 text-success text-xs font-medium bg-success/5 border border-success/20 rounded-lg px-3 py-2'>
            <CheckCircle2 className='w-3.5 h-3.5' />
            Decision submitted
          </div>
        )}

        <div>
          <p className='text-xs font-semibold text-secondary-black uppercase tracking-wide mb-2'>
            Weighted score
          </p>
          <p className={cn("text-3xl font-bold", scoreColor(weightedScore))}>
            {weightedScore ?? "--"}
            <span className='text-sm text-secondary-black font-normal'> / 100</span>
          </p>
        </div>

        <div>
          <p className='text-xs font-semibold text-secondary-black uppercase tracking-wide mb-2'>
            Recommendation
          </p>
          <div className='flex flex-col gap-2'>
            {RECOMMENDATIONS.map(r => (
              <button
                key={r.value}
                type='button'
                onClick={() => setRecommendation(r.value)}
                className={cn(
                  "text-sm font-medium rounded-lg border px-3 py-2 text-left",
                  recommendation === r.value ? r.color : "border-[#EAECF0] text-secondary-black"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className='text-xs font-semibold text-secondary-black uppercase tracking-wide mb-2'>Confidence</p>
          <div className='flex gap-1.5'>
            {CONFIDENCE.map(c => (
              <button
                key={c}
                type='button'
                onClick={() => setConfidence(c)}
                className={cn(
                  "flex-1 text-xs font-medium rounded-md py-1.5 capitalize",
                  confidence === c ? "bg-primary text-white" : "bg-[#F5F6F7] text-secondary-black"
                )}
              >
                {c.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <button
          type='button'
          onClick={handleSubmit}
          disabled={submitting}
          className='btn btn-primary text-white rounded-lg w-full'
        >
          {submitting ? "Submitting..." : submitted ? "Update Decision" : "Submit Decision"}
        </button>
      </div>
    </aside>
  );
};

export default DecisionPanel;
