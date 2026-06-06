"use client";

import { toast } from "sonner";
import { useState } from "react";
import { LuX } from "react-icons/lu";
import { addMinutes } from "date-fns";
import { BsDot } from "react-icons/bs";
import ReactCountdown, { zeroPad } from "react-countdown";
import { Countdown as DaisyuiCountdown, Button } from "react-daisyui";

import {
  CompanySkillAssessment,
  ID,
  MCQAnswer,
  MCQSection,
} from "@/app/common/types";

import {
  cn,
  handleFormSubmissionError,
  getAssessmentDurationInMinutes,
} from "@/app/common/utils";
import NotesIcon from "@/app/common/icons/NotesIcon";
import { useAlert } from "@/app/common/store/useAlert";
import StopWatchIcon from "@/app/common/icons/StopWatchIcon";
import { useMultiStep } from "@/app/common/store/useMultiStep";
import { mcqInstructions } from "../../constants/mcq.constants";
import { attemptCompanyAssessmentMCQs } from "@/app/common/services/assessment";
import { useAssessmentSecurity } from "@/app/common/hooks/useAssessmentSecurity";

const AssessmentMCQQuiz = ({
  mcqSection,
  assessment,
  checkoutUrl,
  mode = "talent-verification",
  jobId,
  daysLeftToTakeAssessment,
}: {
  mcqSection: MCQSection;
  assessment: CompanySkillAssessment;
  checkoutUrl?: string;
  mode?: "talent-verification" | "job-application";
  jobId?: string;
  daysLeftToTakeAssessment?: number;
}) => {
  const setAlert = useAlert(state => state.setAlert);
  const [hasStarted, setHasStarted] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeAlmostUp, setTimeAlmostUp] = useState(false);
  const [endDateTime, setEndDateTime] = useState<Date>();
  const [answers, setAnswers] = useState<MCQAnswer[]>([]);
  const [activeOption, setActiveOption] = useState<number>();
  const { step: activeStepIndex, nextStep, setStep, prevStep } = useMultiStep();
  const assessmentDurationInMinutes =
    getAssessmentDurationInMinutes(assessment);

  // Enable assessment security measures
  useAssessmentSecurity();

  const questions = mcqSection.mcq_questions;
  const maxStepIndex = questions.length - 1;
  const activeQuestion = questions[activeStepIndex];
  const isAtLastStep = activeStepIndex === maxStepIndex;

  const submit = async (_answers = answers) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await attemptCompanyAssessmentMCQs(assessment.id, {
        answers: [{ section_id: mcqSection.id, mcq_answers: _answers }],
      });
      if (!res.success) {
        throw Error(res.error);
      }
      setStep(0);
      toast.success("Your score has been recorded");

      // Handle different completion flows based on mode
      if (mode === "job-application") {
        window.location.href = `/jobs/${jobId}/assessment/${assessment.id}/results`;
      } else {
        window.location.href = `/assessments/${assessment.id}/results`;
      }
    } catch (error) {
      handleFormSubmissionError(error, undefined, setAlert);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (
    mcq_id: ID,
    selected_option_index: number,
    skipSubmit = false
  ) => {
    const _answers = [
      ...answers.filter(ans => ans.mcq_id !== mcq_id),
      { mcq_id, selected_option_index },
    ];
    setAnswers(_answers);
    if (!isAtLastStep) {
      nextStep(maxStepIndex);
      setActiveOption(undefined);
      return;
    }
    if (skipSubmit) return;
    submit(_answers);
  };

  const handleCheckout = () =>
    setAlert({
      title: "You need make a payment to access this assessment",
      message: "Do you want to make a payment to access this assessment?",
      icon: "info",
      buttonText: "Make Payment",
      buttonAction: () => {
        if (!checkoutUrl) return;
        window.location.href = checkoutUrl;
      },
      buttonClassName: "btn-primary text-white",
      secondaryButton: {
        text: "Cancel",
      },
    });

  const handleOnclick = () => {
    if (disabled) {
      submit();
    }
    if (!hasStarted) {
      if (checkoutUrl) return handleCheckout();
      if (daysLeftToTakeAssessment) {
        setAlert({
          title: "Assessment Cooldown",
          message: `You can take this assessment in ${daysLeftToTakeAssessment} days.`,
          icon: "info",
          buttonText: "OK",
          buttonClassName: "btn-primary text-white",
        });
        return;
      }
      setHasStarted(true);
      setEndDateTime(addMinutes(new Date(), assessmentDurationInMinutes));
    } else {
      if (disabled) return;
      if (activeOption) handleSubmit(activeQuestion.id, activeOption);
      else if (
        typeof answers.at(activeStepIndex)?.selected_option_index === "number"
      )
        handleSubmit(
          activeQuestion.id,
          answers.at(activeStepIndex)!.selected_option_index!
        );
    }
  };

  const exit = () => {
    if (hasStarted) {
      setAlert({
        title: "Are you sure?",
        message:
          "Quitting will submit the assessment. Are you sure you want to exit?",
        icon: "warning",
        buttonText: "Exit",
        buttonAction: () => {
          submit();
        },
        buttonClassName: "btn-error text-white",
        secondaryButton: {
          text: "Cancel",
        },
      });
    } else {
      setStep(0);
      if (mode === "job-application") {
        window.location.href = `/jobs/${jobId}`;
      } else {
        window.location.href = `/talents/assessments/${assessment.id}`;
      }
    }
  };

  const goToPrevQuestion = () => prevStep();

  // Disable copying of assessment content
  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.error("Copying assessment content is not allowed");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Disable Ctrl+C, Ctrl+A, Ctrl+V, Ctrl+X, F12, Ctrl+Shift+I, Ctrl+U
    if (
      (e.ctrlKey &&
        (e.key === "c" ||
          e.key === "C" ||
          e.key === "a" ||
          e.key === "A" ||
          e.key === "v" ||
          e.key === "V" ||
          e.key === "x" ||
          e.key === "X" ||
          e.key === "u" ||
          e.key === "U")) ||
      (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) ||
      e.key === "F12"
    ) {
      e.preventDefault();
      toast.error("This action is not allowed during assessment");
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.error("Right-click is disabled during assessment");
  };

  const handleTimeUp = async () => {
    setDisabled(true);
    await submit();
  };

  return (
    <main
      className='bg-white flex flex-col min-h-[calc(100svh-7rem-0.75rem)] md:min-h-[calc(100svh-7rem-2rem)]'
      onCopy={handleCopy}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
    >
      <div className='flex items-center px-5 gap-8'>
        <button onClick={exit}>
          <LuX className='text-sm text-primary-black' />
        </button>
        <div className='relative h-6 flex-1'>
          <progress
            className='progress progress-primary h-6 bg-transparent z-[2] rounded-md [&::-webkit-progress-value]:rounded-md [&::-moz-progress-bar]:rounded-md'
            value={((activeStepIndex + 1) / (maxStepIndex + 1)) * 100}
            max='100'
          />
          <progress
            className='progress bg-[#5374E71A] rounded-[4px] h-2.5 absolute left-0 top-[7px] z-[1]'
            value={0}
            max='100'
          />
          <p
            className='absolute top-0 left-0 text-white text-base font-medium z-[3] text-right pr-1.5'
            style={{
              width: `${((activeStepIndex + 1) / (maxStepIndex + 1)) * 100}%`,
            }}
          >
            {activeStepIndex + 1}/{questions.length}
          </p>
        </div>
        <div
          className={cn(
            "bg-[#C0DFF4] rounded-lg px-4 py-2 flex items-center justify-center gap-2 text-xl font-medium text-[#292D32]",
            timeAlmostUp && "bg-[#FFE9B0]"
          )}
        >
          <StopWatchIcon className='text-[#292D32]' />
          {!(hasStarted && endDateTime) ? (
            <h6>{zeroPad(assessmentDurationInMinutes)}:00</h6>
          ) : (
            <ReactCountdown
              date={endDateTime}
              onComplete={handleTimeUp}
              onStop={handleTimeUp}
              renderer={({ minutes, seconds }) => (
                <span className='flex items-center'>
                  <DaisyuiCountdown value={minutes} />:
                  <DaisyuiCountdown value={seconds} />
                </span>
              )}
              onTick={({ minutes }) => {
                const _timeAlmostUp =
                  minutes < assessmentDurationInMinutes * 0.2;
                if (_timeAlmostUp && !timeAlmostUp) setTimeAlmostUp(true);
              }}
            />
          )}
          <div className='countdown hidden' />
        </div>
      </div>

      <div className='flex-1 flex flex-col items-center justify-center border-b border-[#EAECF0] pb-4 mt-6'>
        {!hasStarted ? (
          <div className='md:max-w-[713px] w-full text-center'>
            <p className='text-base font-medium text-secondary-black'>
              MULTIPLE-CHOICE QUESTIONS
            </p>
            <h2 className='text-2xl md:text-3xl font-semibold mt-7 mb-3 md:mb-4 text-primary-black'>
              {assessment.title}
            </h2>
            {/* <h5 className='text-secondary-black font-medium text-sm md:text-xl'>
              {assessment.description}
            </h5> */}

            <div className='flex items-center justify-center gap-2 text-base text-[#9DA3A8] mt-4'>
              <NotesIcon size={22} />
              <p className='text-sm'>
                {mcqSection.mcq_questions?.length ?? 0} questions
              </p>
              <BsDot aria-hidden />
              <StopWatchIcon />
              <p className='text-sm'>{assessmentDurationInMinutes} minutes</p>
            </div>

            <div className='mt-10 mb-5 divider text-base text-secondary-black w-full'>
              Before you start
            </div>
            <div className='grid md:grid-cols-2 gap-y-6 gap-x-9 text-left'>
              {mcqInstructions(mode === "job-application").map(
                ({ Icon, text }) => (
                  <div className='flex gap-3 items-start' key={text}>
                    <Icon
                      size={24}
                      className='text-2xl text-[##141B34] shrink-0'
                    />
                    <h6 className='text-base font-medium text-secondary-black'>
                      {text}
                    </h6>
                  </div>
                )
              )}
            </div>
          </div>
        ) : (
          <div className='w-full'>
            <h2
              className='text-2xl text-primary-black font-semibold text-center select-none'
              onCopy={handleCopy}
              onContextMenu={handleContextMenu}
            >
              {activeQuestion.question}
            </h2>
            <div className='mt-6 md:mt-11 flex flex-col gap-6'>
              {activeQuestion.options.map(({ index, label, ...rest }) => (
                <button
                  key={`question-${activeQuestion.id}-option-${index}`}
                  onClick={() => {
                    setActiveOption(+index);
                    handleSubmit(activeQuestion.id, +index, true);
                  }}
                  disabled={disabled}
                  className={cn(
                    "cursor-pointer flex items-center justify-between gap-2 px-6 py-3 rounded-lg border-[#EAECF0] border-2 hover:border-primary select-none",
                    answers.at(activeStepIndex)?.selected_option_index ===
                      +index && "border-primary"
                  )}
                  onCopy={handleCopy}
                  onContextMenu={handleContextMenu}
                >
                  <h6 className='text-primary-black text-base font-medium'>
                    {label ?? (rest as any).value}
                  </h6>
                  <p className='text-secondary-black text-sm font-medium'>
                    {index}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className='flex justify-between mt-6'>
        <Button
          onClick={goToPrevQuestion}
          disabled={!hasStarted || activeStepIndex === 0}
          className='btn btn-primary btn-outline px-8 py-3 flex-1 sm:max-w-[253px] font-medium disabled:text-white'
        >
          Previous
        </Button>
        {process.env.NODE_ENV === "development" && (
          <Button
            onClick={() => {
              setActiveOption(activeQuestion.correct_option_index);
              handleSubmit(
                activeQuestion.id,
                activeQuestion.correct_option_index,
                true
              );
            }}
            disabled={!hasStarted}
            className='btn btn-warning text-white py-3 mx-3 sm:max-w-[253px] font-medium disabled:text-white'
          >
            Pick correct answer
          </Button>
        )}
        <Button
          loading={submitting}
          onClick={handleOnclick}
          disabled={hasStarted && !answers.at(activeStepIndex)}
          className='btn btn-primary px-8 py-3 flex-1 sm:max-w-[253px] font-medium disabled:text-white'
        >
          {!hasStarted ? "Start Now" : !isAtLastStep ? "Next" : "Submit"}
        </Button>
      </div>
    </main>
  );
};

export default AssessmentMCQQuiz;
