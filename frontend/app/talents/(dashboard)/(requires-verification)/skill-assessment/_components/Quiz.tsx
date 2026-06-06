"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

import CountDown from "./CountDown";
import { AssessmentQuestion, ID } from "@/app/common/types";
import { useMultiStep } from "@/app/common/store/useMultiStep";
import { attemptQuestion } from "@/app/common/services/assessment";

type QuizProps = {
  endTime: Date;
  questions: AssessmentQuestion[];
  quizAttempt: ID;
};

const Quiz = ({ endTime, questions, quizAttempt }: QuizProps) => {
  const router = useRouter();
  const [activeOption, setActiveOption] = useState<number>();
  const { step: activeStepIndex, nextStep } = useMultiStep();
  const maxStepIndex = questions.length - 1;
  const activeQuestion = questions[activeStepIndex];
  const isAtLastStep = activeStepIndex === maxStepIndex;

  const handleSubmit = (question: ID, answer?: number) => {
    // if (!isAtLastStep) return nextStep(maxStepIndex);
    const promise = attemptQuestion({
      quiztaker: quizAttempt,
      question,
      answer,
      completed: isAtLastStep,
    });
    toast.promise(promise, {
      loading: isAtLastStep
        ? "Processing your result..."
        : "Submitting your answer...",
      success: () => {
        if (!isAtLastStep) {
          nextStep(maxStepIndex);
          setActiveOption(undefined);
          return "Moving to the next question";
        }
        router.replace(`/talents/skill-assessment/results/${quizAttempt}`);
        return "You're score has been recorded";
      },
      error: error => {
        console.log(error);
        return error?.message ?? "An error occured";
      },
    });
  };

  return (
    <>
      <div className='flex flex-col-reverse sm:flex-col gap-6 sm:gap-8'>
        <CountDown date={endTime} />
        <div className='flex max-sm:flex-col-reverse gap-5'>
          <progress
            className='progress progress-primary w-full'
            value={((activeStepIndex + 1) / (maxStepIndex + 2)) * 100}
            max={100}
          />
          <h5 className='text-gray-900 sm:text-[#000000C9] font-semibold sm:font-medium text-lg sm:text-sm flex max-sm:flex-row-reverse max-sm:justify-end'>
            <span className='mr-1'>
              {activeStepIndex + 1}/{questions.length}
            </span>
            Question<span className='max-sm:hidden'>s</span>
          </h5>
        </div>
      </div>
      <div className='sm:border sm:py-[74px] w-full'>
        <div className='max-w-md mx-auto'>
          <h2 className='text-2xl -tracking-[0.5px]'>{activeQuestion.label}</h2>
          <div className='divider mb-0 mt-5 sm:mt-8' />
          <ul className='my-6 sm:my-10 flex flex-col gap-6'>
            {Object.entries(activeQuestion.options).map(([optId, opt]) => (
              <li
                key={`question-${activeQuestion.id}-option-${optId}`}
                className='w-full bg-[#D9DDFF4F] pl-5 py-4'
              >
                <label className='label cursor-pointer justify-start gap-2'>
                  <input
                    type='checkbox'
                    name={`question-${activeQuestion.id}`}
                    value={optId}
                    checked={activeOption === +optId}
                    onChange={() => setActiveOption(+optId)}
                    // checked={activeOption === +optId}
                    className='checkbox checkbox-primary rounded-none border-[#EAECF0] bg-white'
                  />
                  <span className='label-text text-[#393F47] text-base ml-2 font-medium'>
                    {opt}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className='divider mt-0 mb-6 sm:mb-8' />
          <div className='flex justify-end gap-3'>
            <button
              className='btn btn-outline border-gray-300 text-base text-gray-700 font-medium max-sm:flex-1'
              onClick={() => handleSubmit(activeQuestion.id)}
            >
              Skip Question
            </button>
            <button
              className='btn btn-primary text-base font-medium max-sm:flex-1'
              onClick={() => handleSubmit(activeQuestion.id, activeOption)}
              disabled={!activeOption}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Quiz;
