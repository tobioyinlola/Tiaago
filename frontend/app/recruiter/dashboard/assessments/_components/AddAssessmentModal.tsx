"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { cn } from "@/app/common/utils";
import Modal from "@/app/common/components/Modal";
import NotesIcon from "@/app/common/icons/NotesIcon";

export const addAssessmentModalId = "add-assessment-modal";

type AssessementType = "mcq" | "coding_task" | "custom";

export const assessmentTypes = [
  {
    type: "mcq" as const,
    name: "Multiple-Choice Question (MCQs)",
    grading: "Auto grading",
    Icon: NotesIcon,
  },
  {
    type: "coding_task" as const,
    name: "Coding Task",
    grading: "Hybrid grading",
    Icon: CodingTaskIcon,
  },
  {
    type: "custom" as const,
    name: "Custom Assessment",
    grading: "Hybrid grading",
    Icon: CustomAssessmentIcon,
  },
];

const AddAssessmentModal = () => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [assessmentType, setAssessmentType] = useState<AssessementType>("mcq");
  return (
    <Modal id={addAssessmentModalId} modalRef={modalRef} autoHeight>
      <>
        <h1 className='font-semibold text-2xl text-[26px] text-primaryBlack'>
          Select Assessment Type
        </h1>
        <p className='text-[#999999] text-sm mt-2'>
          Select an assessment type to start build your custom assessment
        </p>

        <hr className='mt-4 mb-8' />

        <div className='space-y-6'>
          {assessmentTypes.map(({ type, name, grading, Icon }) => (
            <button
              key={type}
              className={cn(
                "border border-[#dbdee0] p-4 rounded-[10px] stroke-[#2E3031] flex gap-5 justify-between items-center w-full",
                assessmentType === type && "bg-primary text-white stroke-white"
              )}
              onClick={() => setAssessmentType(type)}
            >
              <div className='flex items-center gap-3'>
                <Icon />
                <p className='font-medium text-base'>{name}</p>
              </div>
              <div
                className={cn(
                  "flex items-center justify-center px-2 py-[2px] bg-[#F1F3FF] rounded-full",
                  assessmentType === type && "bg-white"
                )}
              >
                <p className='font-medium text-xs text-primary'>{grading}</p>
              </div>
            </button>
          ))}

          <div className='flex justify-center mt-8 md:pt-14'>
            <Link
              href={
                "/recruiter/dashboard/assessments/add?type=" + assessmentType
              }
              className='btn btn-primary w-4/5'
            >
              Build Assessment
            </Link>
          </div>
        </div>
      </>
    </Modal>
  );
};

export default AddAssessmentModal;

function CodingTaskIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      fill='none'
      viewBox='0 0 24 24'
    >
      <path
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.5'
        d='m16 10 1.227 1.057c.515.445.773.667.773.943s-.258.498-.773.943L16 14M8 10l-1.227 1.057C6.258 11.502 6 11.724 6 12s.258.498.773.943L8 14M13 9l-2 6'
      />
      <path
        stroke='currentColor'
        strokeWidth='1.5'
        d='M2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391S21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12Z'
      />
    </svg>
  );
}

function CustomAssessmentIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      fill='none'
      viewBox='0 0 24 24'
    >
      <circle
        cx='6.5'
        cy='6.5'
        r='4.5'
        stroke='currentColor'
        strokeWidth='1.5'
      ></circle>
      <path
        stroke='currentColor'
        strokeWidth='1.5'
        d='M11 6h7.276c2.258 0 3.387 0 3.669.678.28.679-.518 1.477-2.115 3.074L9.752 19.83c-1.597 1.597-2.395 2.396-3.074 2.115C6 21.663 6 20.535 6 18.276V11'
      ></path>
      <path
        stroke='currentColor'
        strokeWidth='1.5'
        d='M17.5 12h.5c1.886 0 2.828 0 3.414.586S22 14.114 22 16v1c0 1.886 0 2.828-.586 3.414S19.886 21 18 21h-1c-1.886 0-2.828 0-3.414-.586S13 18.886 13 17v-.5'
      ></path>
    </svg>
  );
}
