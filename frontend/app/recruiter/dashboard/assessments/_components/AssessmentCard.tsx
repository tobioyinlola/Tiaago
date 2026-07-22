"use client";

import Link from "next/link";
import { useRef } from "react";
import { Clock, ListChecks, Send } from "lucide-react";

import { cn, getAssessmentDurationInMinutes, getNoOfAssementQuestions } from "@/app/common/utils";
import { CompanySkillAssessment } from "@/app/common/types";
import InviteCandidatesModal from "./InviteCandidatesModal";

const difficultyToneMap: Record<string, string> = {
  JUNIOR: "bg-badge-green-bg text-badge-green-text",
  INTERMEDIATE: "bg-badge-blue-bg text-badge-blue-text",
  SENIOR: "bg-badge-purple-bg text-badge-purple-text",
};

const StatusBadge = ({ published }: { published?: boolean }) => (
  <span
    className={cn(
      "text-xs font-medium px-2.5 py-1 rounded-full shrink-0",
      published ? "bg-badge-green-bg text-badge-green-text" : "bg-[#F5F6F7] text-secondary-black"
    )}
  >
    {published ? "Published" : "Draft"}
  </span>
);

const AssessmentCard = (assessment: CompanySkillAssessment) => {
  const noOfQuestions = getNoOfAssementQuestions(assessment);
  const inviteModalRef = useRef<HTMLDialogElement>(null);
  const modalId = `invite-candidates-modal-${assessment.id}`;
  const detailsHref = `/recruiter/dashboard/assessments/${assessment.id}`;

  return (
    <div className='group bg-white border border-[#EAECF0] rounded-2lg p-6 hover:shadow-card-hover hover:border-primary/30 transition-all flex flex-col'>
      <Link href={detailsHref} className='flex flex-col flex-1'>
        <div className='flex justify-between items-start gap-3 mb-4'>
          <h3 className='text-primaryBlack text-base md:text-lg font-semibold line-clamp-2'>{assessment.title}</h3>
          <StatusBadge published={assessment.published} />
        </div>

        <div className='flex gap-2 flex-wrap mb-4'>
          <span
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full capitalize",
              difficultyToneMap[assessment.difficulty_level] ?? "bg-[#F5F6F7] text-secondary-black"
            )}
          >
            {assessment.difficulty_level?.toLowerCase()}
          </span>
          <span className='text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F6F7] text-secondary-black capitalize'>
            {assessment.assessment_type === "MCQ"
              ? "MCQs"
              : assessment.assessment_type?.replaceAll("_", " ").toLowerCase()}
          </span>
        </div>

        <p className='text-secondary-black text-sm mb-6 line-clamp-2 flex-1'>{assessment.description}</p>
      </Link>

      <hr className='border-[#EAECF0] -mx-6' />

      <div className='flex items-center justify-between mt-4'>
        <div className='flex items-center gap-4 text-xs text-secondary-black'>
          <div className='flex items-center gap-1.5'>
            <Clock className='w-3.5 h-3.5' />
            <span>{getAssessmentDurationInMinutes(assessment)}m</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <ListChecks className='w-3.5 h-3.5' />
            <span>
              {noOfQuestions} question{noOfQuestions === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {assessment.published ? (
          <button
            type='button'
            onClick={() => inviteModalRef.current?.showModal()}
            className='flex items-center gap-1.5 text-primary text-sm font-medium hover:underline'
          >
            <Send className='w-3.5 h-3.5' />
            Invite
          </button>
        ) : (
          <span className='text-xs text-secondary-black italic'>Not yet published</span>
        )}
      </div>

      {assessment.published && (
        <InviteCandidatesModal assessmentId={assessment.id} modalId={modalId} modalRef={inviteModalRef} />
      )}
    </div>
  );
};

export default AssessmentCard;
