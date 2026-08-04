import { cn } from "@/app/common/utils";
import type { AIInterviewDetail } from "@/app/common/services/ai-interviews";

const TONE: Record<NonNullable<AIInterviewDetail["recommendation"]>, string> = {
  PROCEED: "bg-success/5 border-success/30",
  DO_NOT_PROCEED: "bg-destructive/5 border-destructive/30",
  NEEDS_REVIEW: "bg-amber-50 border-amber-300",
};

const LABEL: Record<NonNullable<AIInterviewDetail["recommendation"]>, string> = {
  PROCEED: "Proceed",
  DO_NOT_PROCEED: "Do not proceed",
  NEEDS_REVIEW: "Needs review",
};

const CONFIDENCE_BADGE: Record<NonNullable<AIInterviewDetail["recommendation_confidence"]>, string> = {
  HIGH: "bg-success/15 text-success",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-[#F5F6F7] text-secondary-black",
};

const RecommendationCard = ({ interview, durationMinutes }: { interview: AIInterviewDetail; durationMinutes?: number | null }) => {
  if (!interview.recommendation) return null;

  return (
    <div className={cn("rounded-2lg border p-6", TONE[interview.recommendation])}>
      <div className='flex items-center gap-3 flex-wrap mb-3'>
        <h3 className='text-lg font-bold text-primaryBlack'>{LABEL[interview.recommendation]}</h3>
        {interview.recommendation_confidence && (
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", CONFIDENCE_BADGE[interview.recommendation_confidence])}>
            {interview.recommendation_confidence} confidence
          </span>
        )}
      </div>

      {interview.recommendation_reasons.length > 0 && (
        <ul className='list-disc list-inside space-y-1 mb-4'>
          {interview.recommendation_reasons.map((reason, index) => (
            <li key={index} className='text-sm text-primaryBlack/90'>
              {reason}
            </li>
          ))}
        </ul>
      )}

      <p className='text-xs text-secondary-black'>
        Based on a {durationMinutes ?? "--"}-minute AI interview. Review the transcript before deciding.
      </p>
    </div>
  );
};

export default RecommendationCard;
