import Link from "next/link";
import { PiDotsThreeVerticalBold } from "react-icons/pi";

import {
  cn,
  getAssessmentDurationInMinutes,
  getNoOfAssementQuestions,
} from "@/app/common/utils";
import { CompanySkillAssessment } from "@/app/common/types";

const TagBadge = ({ tag }: { tag: string }) => {
  return (
    <span
      className={cn(
        "text-xs font-medium italic px-2 py-[2px] bg-[#F1F3FF] text-[#6A7DE8] rounded-full",
        tag === "Unpublished" && "bg-[#FFEDED] text-[#FF4A4A]",
        tag === "Published" && "bg-[#EAFAF1] text-[#2ABA67]"
      )}
    >
      {tag}
    </span>
  );
};

const AssessmentCard = (assessment: CompanySkillAssessment) => {
  const noOfQuestions = getNoOfAssementQuestions(assessment);
  return (
    <Link
      href={`/startups/dashboard/assessments/${assessment.id}`}
      className='border border-[#EAECF0] rounded-lg p-6 hover:shadow-md transition-shadow flex flex-col'
    >
      <div className='flex justify-between items-start mb-4'>
        <div className='flex gap-4'>
          <div>
            <h3 className='text-[#6C757D] text-base md:text-lg font-semibold mb-4'>
              {assessment.title}
            </h3>
            <div className='flex gap-2 flex-wrap'>
              <TagBadge tag={assessment.assessment_type} />
            </div>
          </div>
        </div>
        <button className='text-gray-400 hover:text-gray-600'>
          <PiDotsThreeVerticalBold className='text-xl' />
        </button>
      </div>

      <p className='text-[#9DA3A8] text-sm mb-9'>{assessment.description}</p>

      <hr className='bg-[#EAECF0] -mx-6 mt-auto' />

      <div className='flex items-center justify-between mt-3 text-xs'>
        <div className='flex items-center gap-4 text-[#9DA3A8]'>
          <div className='flex items-center gap-1'>
            <StopWatchIcon />
            <span>{getAssessmentDurationInMinutes(assessment)}m</span>
          </div>
          <div className='flex items-center gap-1'>
            <CommentIcon />
            <span>{noOfQuestions}</span>
          </div>
        </div>
        <button className='flex items-center gap-1 text-primary'>
          <svg
            width='14'
            height='14'
            viewBox='0 0 14 14'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M11.8957 4.68498L10.8767 3.80003C10.1425 3.1624 9.85466 2.81939 9.45706 2.94065C8.96128 3.09185 9.1245 4.04589 9.1245 4.36798C8.35368 4.36798 7.5523 4.30869 6.79251 4.43221C4.28431 4.84 3.5 6.62452 3.5 8.54713C4.2099 8.11196 4.9191 7.62669 5.77232 7.42503C6.83737 7.17326 8.02684 7.29337 9.1245 7.29337C9.1245 7.61549 8.96128 8.56953 9.45706 8.72073C9.90757 8.8581 10.1425 8.49895 10.8767 7.86136L11.8957 6.97639C12.5208 6.4336 12.8333 6.16217 12.8333 5.83069C12.8333 5.49921 12.5208 5.22781 11.8957 4.68498Z'
              stroke='#5465FF'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M6.16451 1.75C3.9127 1.75405 2.73355 1.80922 1.97998 2.56126C1.16675 3.37284 1.16675 4.67906 1.16675 7.29149C1.16675 9.90395 1.16675 11.2101 1.97997 12.0217C2.7932 12.8333 4.10207 12.8333 6.71979 12.8333C9.33756 12.8333 10.6464 12.8333 11.4597 12.0217C12.0258 11.4567 12.1978 10.6518 12.2501 9.33333'
              stroke='#5465FF'
              strokeWidth='0.875'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
          Invite
        </button>
      </div>
    </Link>
  );
};

export default AssessmentCard;

const StopWatchIcon = () => (
  <svg
    width='12'
    height='12'
    viewBox='0 0 12 12'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M1 11H6.5C8.9853 11 11 8.9853 11 6.5C11 4.01472 8.9853 2 6.5 2C4.18373 2 2.24872 3.75003 2 6'
      stroke='#6C757D'
      strokeLinecap='round'
    />
    <path
      d='M9.25 2.75L9.75 2.25M2.75 2.25L3.25 2.75'
      stroke='#6C757D'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M8.25 4.5L6.78035 5.96969M6.78035 5.96969C6.6446 5.83394 6.4571 5.74999 6.25 5.74999C5.8358 5.74999 5.5 6.08579 5.5 6.49999C5.5 6.91424 5.8358 7.24999 6.25 7.24999C6.6642 7.24999 7 6.91424 7 6.49999C7 6.29289 6.91605 6.10539 6.78035 5.96969Z'
      stroke='#6C757D'
      strokeLinecap='round'
    />
    <path
      d='M6.25 1.75V1'
      stroke='#6C757D'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M5.25 1H7.25'
      stroke='#6C757D'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M1 7.5H2.5'
      stroke='#6C757D'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M1 9.5H3.5'
      stroke='#6C757D'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const CommentIcon = () => (
  <svg
    width='12'
    height='12'
    viewBox='0 0 12 12'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M4 6.75H8M4 4.25H6'
      stroke='#6C757D'
      strokeWidth='0.875'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M3.04941 9.5C2.39935 9.43605 1.91238 9.2408 1.58579 8.9142C1 8.32845 1 7.3856 1 5.5V5.25C1 3.36438 1 2.42158 1.58579 1.83579C2.17158 1.25 3.11438 1.25 5 1.25H7C8.8856 1.25 9.82845 1.25 10.4142 1.83579C11 2.42158 11 3.36438 11 5.25V5.5C11 7.3856 11 8.32845 10.4142 8.9142C9.82845 9.5 8.8856 9.5 7 9.5C6.71975 9.50625 6.49655 9.52755 6.2773 9.5775C5.6781 9.71545 5.12325 10.022 4.57493 10.2894C3.79364 10.6704 3.403 10.8609 3.15785 10.6826C2.68885 10.3333 3.14727 9.25095 3.25 8.75'
      stroke='#6C757D'
      strokeLinecap='round'
    />
  </svg>
);
