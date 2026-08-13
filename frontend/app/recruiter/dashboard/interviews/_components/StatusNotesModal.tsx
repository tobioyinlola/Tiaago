"use client";

import { useState } from "react";
import { Loader2, ClipboardList } from "lucide-react";

import { ID, InterviewReview } from "@/app/common/types";
import { getInterviewReview } from "@/app/common/services/interview-review";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/common/components/ui/dialog";
import DecisionPanel from "../[id]/review/_components/DecisionPanel";

// Replaces navigating to the standalone /review page (see
// interviews/[id]/review/page.tsx, now just a redirect back to this list) --
// the same DecisionPanel (recommendation, confidence, rejection reason,
// advance-to-2nd-interview) now opens inline from the candidate's card
// instead of a full page, so status/decision changes never leave the list.
const StatusNotesModal = ({ interviewId }: { interviewId: ID }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [review, setReview] = useState<InterviewReview | undefined>(undefined);

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (!next || review) return;
    setLoading(true);
    setError(undefined);
    const res = await getInterviewReview(interviewId);
    setLoading(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setReview(res.data);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        type='button'
        onClick={() => handleOpenChange(true)}
        className='btn btn-sm btn-primary text-white rounded-lg gap-1.5 border-none'
      >
        <ClipboardList className='w-3.5 h-3.5' />
        Status & Notes
      </button>
      <DialogContent className='p-0 max-w-[340px] overflow-hidden'>
        <DialogHeader className='px-5 pt-5'>
          <DialogTitle>Interview decision</DialogTitle>
        </DialogHeader>
        {loading && (
          <div className='flex items-center justify-center py-16'>
            <Loader2 className='w-5 h-5 animate-spin text-secondary-black' />
          </div>
        )}
        {!loading && error && (
          <p className='text-sm text-destructive px-5 pb-5'>{error}</p>
        )}
        {!loading && review && (
          <DecisionPanel interviewId={interviewId} review={review} onReviewChange={setReview} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StatusNotesModal;
