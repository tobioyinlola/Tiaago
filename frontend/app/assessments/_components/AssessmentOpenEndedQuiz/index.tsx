"use client";

import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import { addMinutes } from "date-fns";
import { BsDot } from "react-icons/bs";
import ReactCountdown, { zeroPad } from "react-countdown";
import Button from "@/app/common/components/DaisyButton";
import DaisyCountdown from "@/app/common/components/DaisyCountdown";

import { ApiResponse, CompanySkillAssessment, ID, OpenEndedSection } from "@/app/common/types";

import { cn, handleFormSubmissionError, getAssessmentDurationInMinutes } from "@/app/common/utils";
import NotesIcon from "@/app/common/icons/NotesIcon";
import { useAlert } from "@/app/common/store/useAlert";
import StopWatchIcon from "@/app/common/icons/StopWatchIcon";
import { useMultiStep } from "@/app/common/store/useMultiStep";
import { mcqInstructions } from "../../constants/mcq.constants";
import { useAssessmentSecurity } from "@/app/common/hooks/useAssessmentSecurity";

type OpenEndedAnswer = { open_ended_question_id: ID; answer_text: string };

/** Renders an OPEN_ENDED section of a no-login assessment invite: one
 * free-text question at a time, graded manually by the recruiter later --
 * see GradeOpenEndedSerializer server-side. Mirrors AssessmentMCQQuiz's
 * stepper shape (shared timer, submitOverride, forceSubmitSignal) so
 * TakeAssessmentFlow can treat every section type the same way. */
const AssessmentOpenEndedQuiz = ({
  openEndedSection,
  assessment,
  mode = "invite",
  jobId,
  skipIntro = false,
  submitOverride,
  onComplete,
  sharedEndDateTime,
  onTimeExpired,
  forceSubmitSignal,
}: {
  openEndedSection: OpenEndedSection;
  assessment: CompanySkillAssessment;
  mode?: "talent-verification" | "job-application" | "invite";
  jobId?: string;
  /** Skip this component's own pre-start instructions screen -- used by the
   * no-login invite flow, which already shows its own instructions/ready
   * screens before the candidate ever reaches this component. */
  skipIntro?: boolean;
  /** Overrides the default authenticated submit call -- used by the no-login
   * invite flow to submit via its token-based endpoint instead. */
  submitOverride?: (data: {
    answers: { section_id: ID; open_ended_answers: OpenEndedAnswer[] }[];
  }) => Promise<ApiResponse<unknown>>;
  /** Overrides the default mode-based redirect on successful submit. */
  onComplete?: () => void;
  /** Overall assessment-level countdown target, shared across every section
   * so the timer doesn't reset when a new section mounts. */
  sharedEndDateTime?: Date;
  /** Called instead of onComplete when the shared timer runs out. */
  onTimeExpired?: () => void;
  /** Bumped by the parent when proctoring forces an early end -- submits
   * whatever's currently answered so far instead of discarding it. */
  forceSubmitSignal?: number;
}) => {
  const setAlert = useAlert(state => state.setAlert);
  const [hasStarted, setHasStarted] = useState(skipIntro);
  const [disabled, setDisabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeAlmostUp, setTimeAlmostUp] = useState(false);
  const [endDateTime, setEndDateTime] = useState<Date>();
  const [answers, setAnswers] = useState<OpenEndedAnswer[]>([]);
  const [draft, setDraft] = useState("");
  const { step: activeStepIndex, nextStep, setStep, prevStep } = useMultiStep();
  const assessmentDurationInMinutes = getAssessmentDurationInMinutes(assessment);

  useAssessmentSecurity();

  useEffect(() => {
    if (skipIntro) {
      setEndDateTime(sharedEndDateTime ?? addMinutes(new Date(), assessmentDurationInMinutes));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const questions = openEndedSection.open_ended_questions;
  const maxStepIndex = questions.length - 1;
  const activeQuestion = questions[activeStepIndex];
  const isAtLastStep = activeStepIndex === maxStepIndex;

  // Keep the textarea in sync when moving between questions (e.g. via
  // "Previous"), same as the MCQ stepper restoring the previously-picked option.
  useEffect(() => {
    setDraft(answers.find(a => a.open_ended_question_id === activeQuestion?.id)?.answer_text ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStepIndex, activeQuestion?.id]);

  const submit = async (_answers = answers, isTimeUp = false) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const payload = {
        answers: [{ section_id: openEndedSection.id, open_ended_answers: _answers }],
      };
      const res = submitOverride && (await submitOverride(payload));
      if (res && !res.success) {
        throw Error(res.error);
      }
      setStep(0);
      toast.success("Your answers have been recorded");

      if (isTimeUp && onTimeExpired) {
        onTimeExpired();
      } else if (onComplete) {
        onComplete();
      } else if (mode === "job-application") {
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

  const forceSubmitSignalRef = useRef(forceSubmitSignal);
  useEffect(() => {
    if (forceSubmitSignal !== undefined && forceSubmitSignal !== forceSubmitSignalRef.current) {
      forceSubmitSignalRef.current = forceSubmitSignal;
      submit(answers, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSubmitSignal]);

  const saveDraftAnswer = (answer_text: string) => {
    const _answers = [
      ...answers.filter(ans => ans.open_ended_question_id !== activeQuestion.id),
      { open_ended_question_id: activeQuestion.id, answer_text },
    ];
    setAnswers(_answers);
    return _answers;
  };

  const goNext = () => {
    const _answers = saveDraftAnswer(draft);
    if (!isAtLastStep) {
      nextStep(maxStepIndex);
      return;
    }
    submit(_answers);
  };

  const handleOnclick = () => {
    if (!hasStarted) {
      setHasStarted(true);
      setEndDateTime(addMinutes(new Date(), assessmentDurationInMinutes));
      return;
    }
    if (disabled) return;
    goNext();
  };

  const exit = () => {
    if (hasStarted) {
      setAlert({
        title: "Are you sure?",
        message: "Quitting will submit the assessment. Are you sure you want to exit?",
        icon: "warning",
        buttonText: "Exit",
        buttonAction: () => submit(saveDraftAnswer(draft)),
        buttonClassName: "btn-error text-white",
        secondaryButton: { text: "Cancel" },
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

  const goToPrevQuestion = () => {
    saveDraftAnswer(draft);
    prevStep();
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.error("Copying assessment content is not allowed");
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.error("Right-click is disabled during assessment");
  };

  const handleTimeUp = async () => {
    setDisabled(true);
    await submit(saveDraftAnswer(draft), true);
  };

  const currentAnswerText = draft.trim();

  return (
    <main
      className='bg-white flex flex-col min-h-[calc(100svh-7rem-0.75rem)] md:min-h-[calc(100svh-7rem-2rem)]'
      onCopy={handleCopy}
      onContextMenu={handleContextMenu}
    >
      <div className='flex items-center px-3 sm:px-5 gap-3 sm:gap-8'>
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
            style={{ width: `${((activeStepIndex + 1) / (maxStepIndex + 1)) * 100}%` }}
          >
            {activeStepIndex + 1}/{questions.length}
          </p>
        </div>
        <div
          className={cn(
            "bg-[#C0DFF4] rounded-lg px-2.5 sm:px-4 py-2 flex items-center justify-center gap-2 text-base sm:text-xl font-medium text-[#292D32]",
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
                  <DaisyCountdown value={minutes} />:
                  <DaisyCountdown value={seconds} />
                </span>
              )}
              onTick={({ minutes }) => {
                const _timeAlmostUp = minutes < assessmentDurationInMinutes * 0.2;
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
            <p className='text-base font-medium text-secondary-black'>OPEN-ENDED QUESTIONS</p>
            <h2 className='text-xl sm:text-2xl md:text-3xl font-semibold mt-7 mb-3 md:mb-4 text-primary-black'>
              {assessment.title}
            </h2>

            <div className='flex items-center justify-center gap-2 text-base text-[#9DA3A8] mt-4'>
              <NotesIcon size={22} />
              <p className='text-sm'>{questions.length} questions</p>
              <BsDot aria-hidden />
              <StopWatchIcon />
              <p className='text-sm'>{assessmentDurationInMinutes} minutes</p>
            </div>

            <div className='mt-10 mb-5 divider text-base text-secondary-black w-full'>Before you start</div>
            <div className='grid md:grid-cols-2 gap-y-6 gap-x-9 text-left'>
              {mcqInstructions(mode === "job-application").map(({ Icon, text }) => (
                <div className='flex gap-3 items-start' key={text}>
                  <Icon size={24} className='text-2xl text-[##141B34] shrink-0' />
                  <h6 className='text-base font-medium text-secondary-black'>{text}</h6>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className='w-full max-w-[713px] mx-auto'>
            <h2
              className='text-lg sm:text-xl md:text-2xl text-primary-black font-semibold text-center select-none'
              onCopy={handleCopy}
              onContextMenu={handleContextMenu}
            >
              {activeQuestion.question}
            </h2>
            {activeQuestion.skills_assessed?.length > 0 && (
              <div className='flex flex-wrap justify-center gap-2 mt-4'>
                {activeQuestion.skills_assessed.map(skill => (
                  <span
                    key={skill}
                    className='text-xs font-medium px-2 py-[2px] rounded-full bg-[#F1F3FF] text-[#6A7DE8]'
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
            <textarea
              value={draft}
              onChange={e => (disabled ? undefined : setDraft(e.target.value))}
              disabled={disabled}
              onCopy={handleCopy}
              onContextMenu={handleContextMenu}
              placeholder='Type your answer here...'
              rows={10}
              className='mt-6 md:mt-11 w-full textarea textarea-bordered rounded-lg border-[#EAECF0] border-2 focus:border-primary focus:outline-none text-primary-black text-base p-4 resize-y'
            />
            <p className='text-xs text-secondary-black mt-2 text-right'>{currentAnswerText.length} characters</p>
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
        <Button
          loading={submitting}
          onClick={handleOnclick}
          disabled={hasStarted && !currentAnswerText}
          className='btn btn-primary px-8 py-3 flex-1 sm:max-w-[253px] font-medium disabled:text-white'
        >
          {!hasStarted ? "Start Now" : !isAtLastStep ? "Next" : "Submit"}
        </Button>
      </div>
    </main>
  );
};

export default AssessmentOpenEndedQuiz;
