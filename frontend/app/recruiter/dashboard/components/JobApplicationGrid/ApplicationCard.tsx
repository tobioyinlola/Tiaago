import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PiEye, PiUserPlus, PiArrowClockwise } from "react-icons/pi";

import { AiFeedbackItem, JobApplication } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import { AvatarWithVerifiedBadge } from "@/app/common/components/UserAvatar";
import { isBackwardMove, isStageLocked } from "./boardStages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/common/components/ui/select";

export type MovableStatus =
  | "REVIEWED"
  | "PENDING_DECISION"
  | "VENDOR_AI_INTERVIEW"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_COMPLETED"
  | "SECOND_INTERVIEW"
  | "OFFER_EXTENDED"
  | "REJECTED";

// Mirrors jobs.views.JobApplicationRetrieveUpdateView.put's TALENT_ONLY_STATUS_UPDATE
// guard -- OFFER_ACCEPTED/OFFER_DECLINED/WITHDRAWN can only ever be set by the
// candidate themselves, and APPLIED is rejected outright, so neither belongs in a
// recruiter-facing "move to" list. Also doubles as the set of valid drag-drop
// targets on the board (see index.tsx).
export const MOVABLE_STATUSES: { value: MovableStatus; label: string }[] = [
  { value: "REVIEWED", label: "Skill Assessment -- sends assessment invite" },
  { value: "PENDING_DECISION", label: "Interview -- sends interview invite" },
  { value: "VENDOR_AI_INTERVIEW", label: "Vendor AI Interview -- vendor name + link required" },
  { value: "INTERVIEW_SCHEDULED", label: "Interview Scheduled" },
  { value: "INTERVIEW_COMPLETED", label: "Interview Completed" },
  { value: "SECOND_INTERVIEW", label: "Second Interview -- sends a new slot invite" },
  { value: "OFFER_EXTENDED", label: "Offer Extended" },
  { value: "REJECTED", label: "Rejected -- reason required" },
];

const scoreTone = (score: number) => {
  if (score >= 70) return "bg-[#ECFDF3] text-[#027A48]";
  if (score >= 40) return "bg-[#FFFAEB] text-[#B54708]";
  return "bg-[#FFEDED] text-[#B53535]";
};

const ScoreChip = ({ label, score }: { label: string; score: number }) => (
  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", scoreTone(score))}>
    {label} {Math.round(score)}
  </span>
);

const ApplicationCard = ({
  item,
  onView,
  onAddToPipeline,
  onMoveStage,
  onAdvanceRound,
  moving,
  advancingRound,
}: {
  item: AiFeedbackItem;
  onView: () => void;
  onAddToPipeline: () => void;
  onMoveStage: (status: JobApplication["status"]) => void;
  onAdvanceRound: () => void;
  moving: boolean;
  advancingRound: boolean;
}) => {
  const locked = isStageLocked(item);
  // Only a candidate who's done exactly round 1 of a human (Daily.co)
  // interview is eligible -- AI-interview jobs have no Scheduler rows at
  // all (latest_interview_round stays null), and the backend's
  // advance-round endpoint itself caps at round 1 -> 2 only.
  const canAdvanceRound = item.latest_interview_round === 1 && item.status !== "REJECTED";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.application_id,
    data: { item },
    disabled: locked,
  });
  const movableOptions = MOVABLE_STATUSES.filter(s => !isBackwardMove(item, s.value));

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "bg-white rounded-xl border border-[#EAECF0] p-4 flex flex-col gap-3 shadow-sm touch-none",
        locked ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex items-center gap-2 min-w-0'>
          <AvatarWithVerifiedBadge
            profilePic={item.profile_picture}
            firstName={item.talent_name?.split(" ")[0] || ""}
            lastName={item.talent_name?.split(" ")[1] || ""}
            className='w-9'
            verified={item.has_passed_tiaago_assessment}
          />
          <div className='min-w-0'>
            <p className='font-medium text-[#101828] capitalize text-sm truncate'>{item.talent_name}</p>
            <p className='text-[#667085] text-xs truncate'>{item.email}</p>
          </div>
        </div>
        <div
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold shrink-0",
            item.overall_score >= 70 ? "bg-[#ECFDF3] text-[#027A48]" : "bg-[#FFEDED] text-[#B53535]"
          )}
        >
          {parseInt(item.overall_score.toString())}%
        </div>
      </div>

      {item.resume_screening_status === "failed" && (
        <div className='rounded-lg bg-[#FFFAEB] text-[#B54708] text-[11px] font-medium px-2.5 py-1.5'>
          Screening stuck -- check wallet balance
        </div>
      )}

      <div className='flex flex-wrap gap-1.5'>
        <ScoreChip label='Resume' score={item.resume_analysis_score} />
        <ScoreChip label='Assessment' score={item.assessment_score} />
        {item.ai_interview_score != null && <ScoreChip label='AI Interview' score={item.ai_interview_score} />}
      </div>

      {/* Interactive controls opt out of the drag listeners above (via
          onPointerDown stopPropagation) so clicking them never gets
          mistaken for a drag start. */}
      <div className='flex items-center gap-2 pt-1 border-t border-[#F5F5F5]' onPointerDown={e => e.stopPropagation()}>
        <Select
          value={movableOptions.some(s => s.value === item.status) ? item.status : undefined}
          onValueChange={value => onMoveStage(value as JobApplication["status"])}
          disabled={moving || locked}
        >
          <SelectTrigger className='h-8 text-xs flex-1 min-w-0'>
            <SelectValue placeholder={locked ? "Locked" : "Move to..."} />
          </SelectTrigger>
          <SelectContent>
            {movableOptions.map(s => (
              <SelectItem key={s.value} value={s.value} className='text-xs'>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type='button'
          onClick={onView}
          aria-label={`View details for ${item.talent_name}`}
          title='View detailed report'
          className='w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-[#7F7F7F] hover:text-primary hover:bg-primary/5'
        >
          <PiEye className='text-lg' />
        </button>
        <button
          type='button'
          onClick={onAddToPipeline}
          aria-label={`Add ${item.talent_name} to pipeline`}
          title='Add to Pipeline'
          className='w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-[#7F7F7F] hover:text-primary hover:bg-primary/5'
        >
          <PiUserPlus className='text-lg' />
        </button>
        {canAdvanceRound && (
          <button
            type='button'
            onClick={onAdvanceRound}
            disabled={advancingRound}
            aria-label={`Move ${item.talent_name} to a second interview`}
            title='Move to 2nd interview'
            className='w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-[#7F7F7F] hover:text-primary hover:bg-primary/5 disabled:opacity-50'
          >
            <PiArrowClockwise className='text-lg' />
          </button>
        )}
      </div>
    </div>
  );
};

export default ApplicationCard;
