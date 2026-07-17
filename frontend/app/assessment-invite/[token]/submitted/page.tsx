"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Star } from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";
import BrandLink from "@/app/common/components/BrandLink";
import { useInviteFlow } from "../_components/InviteFlowProvider";
import { submitAssessmentInviteFeedback } from "@/app/common/services/assessment-invite";

const SubmittedPage = () => {
  const { token } = useInviteFlow();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await submitAssessmentInviteFeedback(token, {
      rating: rating || undefined,
      comment: comment.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setSubmitted(true);
    toast.success("Thanks for your feedback!");
  };

  return (
    <div className='min-h-screen w-full bg-white flex flex-col'>
      <header className='w-full px-6 md:px-10 py-5'>
        <BrandLink containerClassName='block w-fit' />
      </header>

      <div className='flex-1 flex items-center justify-center px-6 py-16'>
        <div className='max-w-lg w-full text-center'>
          <div className='mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-6'>
            <CheckCircle2 className='h-8 w-8 text-success' />
          </div>
          <h1 className='text-2xl md:text-3xl font-bold text-primary-black mb-3'>
            Your assessment has been submitted!
          </h1>
          <p className='text-secondary-black mb-10'>
            The recruiter has received your assessment. If you have any questions or need support,
            please reply to the invitation email you received.
          </p>

          {!submitted ? (
            <div>
              <p className='font-semibold text-primary-black mb-4'>Let us know your feedback</p>
              <div className='flex items-center justify-center gap-2 mb-5'>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type='button'
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        star <= (hoverRating || rating)
                          ? "fill-warning text-warning"
                          : "text-gray-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder='Enter your feedback here...'
                rows={4}
                className='w-full bg-white border border-[#D0D5DD] focus:border-primary rounded-lg px-4 py-3 text-primary-black placeholder:text-gray-400 outline-none transition-colors mb-5 resize-none'
              />
              <DaisyButton
                color='primary'
                className='text-white px-10'
                loading={submitting}
                disabled={!rating && !comment.trim()}
                onClick={handleSubmit}
              >
                {submitting ? "" : "Submit"}
              </DaisyButton>
            </div>
          ) : (
            <p className='text-success text-sm font-medium'>Thanks for your feedback!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmittedPage;
