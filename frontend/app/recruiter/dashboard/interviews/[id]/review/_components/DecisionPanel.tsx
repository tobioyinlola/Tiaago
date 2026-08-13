"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { ID, InterviewConfidenceValue, InterviewRecommendationValue, InterviewReview } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import { advanceInterviewRound, submitInterviewDecision } from "@/app/common/services/interview-review";
import { getInterviewScorecard } from "@/app/common/services/interview-workspace";
import { Button } from "@/app/common/components/ui/button";
import { Textarea } from "@/app/common/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/common/components/ui/dialog";

const RECOMMENDATIONS: { value: InterviewRecommendationValue; label: string; color: string }[] = [
  { value: "STRONG_YES", label: "Strong Yes", color: "border-success bg-success/5 text-success" },
  { value: "YES", label: "Yes", color: "border-success/60 bg-success/5 text-success" },
  { value: "MAYBE", label: "Maybe", color: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "NO", label: "No", color: "border-destructive/60 bg-destructive/5 text-destructive" },
  { value: "STRONG_NO", label: "Strong No", color: "border-destructive bg-destructive/5 text-destructive" },
];

const CONFIDENCE: InterviewConfidenceValue[] = ["LOW", "MEDIUM", "HIGH"];

const REJECTING_RECOMMENDATIONS: InterviewRecommendationValue[] = ["NO", "STRONG_NO"];

// Submitting a decision also syncs the candidate's pipeline stage (see
// scheduler.review_views.InterviewDecisionView) -- surfaced here so the
// recruiter isn't surprised that Strong No/No fires a rejection email
// immediately on submit.
const PIPELINE_NOTE: Partial<Record<InterviewRecommendationValue, string>> = {
  STRONG_YES: "Submitting will move this candidate to Offer Extended.",
  YES: "Submitting will move this candidate to Offer Extended.",
  NO: "Submitting will reject this candidate -- you'll be asked for a reason to email them.",
  STRONG_NO: "Submitting will reject this candidate -- you'll be asked for a reason to email them.",
};

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

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [advancing, setAdvancing] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    getInterviewScorecard(interviewId).then(res => {
      if (res.success) setWeightedScore(res.data.overall_score);
    });
  }, [interviewId]);

  const submitted = !!review.summary?.submitted_at;
  const alreadyRejected = review.summary?.recommendation
    ? REJECTING_RECOMMENDATIONS.includes(review.summary.recommendation) && submitted
    : false;

  const doSubmit = async (extra?: { rejection_reason?: string }) => {
    if (!recommendation || !confidence) return;
    setSubmitting(true);
    const res = await submitInterviewDecision(interviewId, {
      recommendation,
      confidence,
      overall_score: weightedScore ?? undefined,
      ...extra,
    });
    setSubmitting(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Decision submitted");
    setRejectModalOpen(false);
    setRejectionReason("");
    onReviewChange({ ...review, summary: res.data });
  };

  const handleSubmit = async () => {
    if (!recommendation || !confidence) {
      toast.error("Choose a recommendation and confidence level first.");
      return;
    }
    // A reason is only required the first time this application actually
    // transitions into Rejected -- resubmitting an already-rejected
    // decision (e.g. after editing confidence) skips straight through,
    // matching the backend's own idempotency.
    if (REJECTING_RECOMMENDATIONS.includes(recommendation) && !alreadyRejected) {
      setRejectModalOpen(true);
      return;
    }
    await doSubmit();
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) return;
    await doSubmit({ rejection_reason: rejectionReason.trim() });
  };

  const handleAdvanceRound = async () => {
    setAdvancing(true);
    const res = await advanceInterviewRound(interviewId);
    setAdvancing(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Candidate invited to a second interview");
    setAdvanced(true);
  };

  const canAdvanceRound = review.round < 2 && !advanced && !!review.job_application_id;

  return (
    <aside className='w-[300px] shrink-0 bg-white border-l border-[#EAECF0] flex flex-col overflow-y-auto'>
      <div className='p-5 flex flex-col gap-5'>
        {submitted && (
          <div className='flex items-center gap-2 text-success text-xs font-medium bg-success/5 border border-success/20 rounded-lg px-3 py-2'>
            <CheckCircle2 className='w-3.5 h-3.5' />
            Decision submitted
          </div>
        )}

        {advanced && (
          <div className='flex items-center gap-2 text-primary text-xs font-medium bg-primary/5 border border-primary/20 rounded-lg px-3 py-2'>
            <CheckCircle2 className='w-3.5 h-3.5' />
            Invited to a second interview
          </div>
        )}

        {review.round > 1 && (
          <span className='text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full w-fit'>
            Interview #{review.round}
          </span>
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

        {recommendation && PIPELINE_NOTE[recommendation] && (
          <p
            className={cn(
              "text-xs rounded-lg px-3 py-2 border",
              recommendation === "NO" || recommendation === "STRONG_NO"
                ? "text-destructive bg-destructive/5 border-destructive/20"
                : "text-success bg-success/5 border-success/20"
            )}
          >
            {PIPELINE_NOTE[recommendation]}
          </p>
        )}

        <button
          type='button'
          onClick={handleSubmit}
          disabled={submitting}
          className='btn btn-primary text-white rounded-lg w-full'
        >
          {submitting ? "Submitting..." : submitted ? "Update Decision" : "Submit Decision"}
        </button>

        {canAdvanceRound && (
          <>
            <div className='flex items-center gap-2 text-[11px] text-secondary-black'>
              <span className='flex-1 border-t border-[#EAECF0]' />
              or
              <span className='flex-1 border-t border-[#EAECF0]' />
            </div>
            <div>
              <button
                type='button'
                onClick={handleAdvanceRound}
                disabled={advancing}
                className='btn btn-outline rounded-lg w-full'
              >
                {advancing ? "Inviting..." : "Advance to 2nd interview"}
              </button>
              <p className='text-[11px] text-secondary-black mt-1.5'>
                Invites this candidate to a second interview, the same way the first one worked -- they&apos;ll
                get an email to pick a new time slot.
              </p>
            </div>
          </>
        )}
      </div>

      <Dialog open={rejectModalOpen} onOpenChange={open => !open && setRejectModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject candidate</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-secondary-black'>
            A reason is required so it can be included in the rejection email sent to{" "}
            <span className='font-medium'>{review.candidate_name}</span>.
          </p>
          <Textarea
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            rows={4}
            placeholder='Why is this candidate being rejected?'
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setRejectModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant='destructive' disabled={!rejectionReason.trim() || submitting} onClick={handleConfirmReject}>
              {submitting ? "Rejecting..." : "Reject candidate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
};

export default DecisionPanel;
