"use client";

import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import { addMinutes } from "date-fns";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const CodeMirrorEditor = dynamic(() => import("./CodeMirrorEditor"), {
  ssr: false,
  loading: () => <div className="h-[400px] animate-pulse bg-gray-100 rounded" />,
});
import ReactCountdown, { zeroPad } from "react-countdown";
import Button from "@/app/common/components/DaisyButton";
import DaisyCountdown from "@/app/common/components/DaisyCountdown";

import {
  cn,
  handleFormSubmissionError,
  getAssessmentDurationInMinutes,
} from "@/app/common/utils";
import { useAlert } from "@/app/common/store/useAlert";
import StopWatchIcon from "@/app/common/icons/StopWatchIcon";
import { mcqInstructions } from "../../constants/mcq.constants";
import { ApiResponse, CodingTaskSection, CompanySkillAssessment } from "@/app/common/types";
import { attemptCompanyAssessmentCodeSection } from "@/app/common/services/assessment";
import { useAssessmentSecurity } from "@/app/common/hooks/useAssessmentSecurity";

const AssessmentCodingTask = ({
  codeSection,
  assessment,
  checkoutUrl,
  mode = "talent-verification",
  jobId,
  onComplete,
  skipIntro = false,
  submitOverride,
  sharedEndDateTime,
  onTimeExpired,
  forceSubmitSignal,
}: {
  codeSection: CodingTaskSection;
  assessment: CompanySkillAssessment;
  checkoutUrl?: string;
  mode?: "talent-verification" | "job-application" | "invite";
  jobId?: string;
  onComplete?: () => void;
  /** Skip this component's own pre-start instructions screen -- used by the
   * no-login invite flow, which already shows its own instructions/ready
   * screens before the candidate ever reaches this component. */
  skipIntro?: boolean;
  /** Overrides the default authenticated submit call -- used by the no-login
   * invite flow to submit via its token-based endpoint instead. */
  submitOverride?: (data: {
    answers: { section_id: number | string; coding_task_answers: { coding_task_id: number | string; user_answer: string }[] }[];
  }) => Promise<ApiResponse<unknown>>;
  /** Overall assessment-level countdown target, shared across every section
   * so the timer doesn't reset when a new section mounts -- used by the
   * no-login invite flow instead of this component's own per-section timer. */
  sharedEndDateTime?: Date;
  /** Called instead of onComplete when the shared timer runs out, so the
   * flow jumps straight to done instead of advancing to the next section. */
  onTimeExpired?: () => void;
  /** Bumped by the parent when proctoring forces an early end (critical
   * violation / max tab switches) -- submits whatever code is on screen via
   * the same partial-submission path as a time-expiry, instead of losing it. */
  forceSubmitSignal?: number;
}) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const [hasStarted, setHasStarted] = useState(skipIntro);
  const [disabled, setDisabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeAlmostUp, setTimeAlmostUp] = useState(false);
  const [endDateTime, setEndDateTime] = useState<Date>();
  const [code, setCode] = useState("\n".repeat(10));
  const [descExpanded, setDescExpanded] = useState(false);
  const assessmentDurationInMinutes = getAssessmentDurationInMinutes(
    assessment,
    true
  );

  // Enable assessment security measures
  useAssessmentSecurity();

  useEffect(() => {
    if (skipIntro) {
      setEndDateTime(sharedEndDateTime ?? addMinutes(new Date(), assessmentDurationInMinutes));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (isTimeUp = false) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const payload = {
        answers: [
          {
            section_id: codeSection.id,
            coding_task_answers: [
              {
                user_answer: code,
                coding_task_id: codeSection.coding_tasks?.at(0)?.id!,
              },
            ],
          },
        ],
      };
      const res = submitOverride
        ? await submitOverride(payload)
        : await attemptCompanyAssessmentCodeSection(
            assessment.id,
            codeSection.id,
            payload.answers[0].coding_task_answers
          );
      if (!res.success) {
        throw Error(res.error);
      }
      toast.success("Your score has been recorded");

      // Handle different completion flows based on mode
      if (isTimeUp && onTimeExpired) {
        onTimeExpired();
      } else if (onComplete) {
        onComplete();
      } else if (mode === "job-application") {
        // Redirect to job application results
        window.location.href = `/jobs/${jobId}/assessment/${assessment.id}/results?tab=coding_task`;
      } else {
        // Talent verification flow - go to results
        window.location.href = `/assessments/${assessment.id}/results?tab=coding_task`;
      }
    } catch (error) {
      handleFormSubmissionError(error, undefined, setAlert);
    } finally {
      setSubmitting(false);
    }
  };

  // Fires only on a genuine change after mount -- proctoring forcing an
  // early end submits whatever code is currently on screen instead of
  // discarding it.
  const forceSubmitSignalRef = useRef(forceSubmitSignal);
  useEffect(() => {
    if (forceSubmitSignal !== undefined && forceSubmitSignal !== forceSubmitSignalRef.current) {
      forceSubmitSignalRef.current = forceSubmitSignal;
      submit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSubmitSignal]);

  const exit = () => {
    if (hasStarted) {
      setAlert({
        title: "Are you sure?",
        message: "Do you want to quit this Quiz Section?",
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
      if (mode === "job-application") {
        window.location.href = `/jobs/${jobId}`;
      } else {
        window.location.href = `/talents/assessments/${assessment.id}`;
      }
    }
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
    if (!hasStarted) {
      if (checkoutUrl) return handleCheckout();
      setHasStarted(true);
      setEndDateTime(addMinutes(new Date(), assessmentDurationInMinutes));
    } else {
      submit();
    }
  };

  const coding_task = codeSection?.coding_tasks?.at(0);

  // Disable pasting and other restricted actions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (process.env.NODE_ENV === "development") return;
    // Disable Ctrl+V, Ctrl+A, F12, Ctrl+Shift+I, Ctrl+U
    if (
      (e.ctrlKey &&
        (e.key === "v" ||
          e.key === "V" ||
          e.key === "a" ||
          e.key === "A" ||
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
    if (process.env.NODE_ENV === "development") return;
    e.preventDefault();
    toast.error("Right-click is disabled during assessment");
  };

  // Handle paste events on the CodeMirror editor
  const handleCodeMirrorPaste = (e: React.ClipboardEvent) => {
    if (process.env.NODE_ENV === "development") return;
    e.preventDefault();
    toast.error("Pasting is not allowed during assessment");
  };

  const handleCodeMirrorDrop = (e: React.DragEvent) => {
    if (process.env.NODE_ENV === "development") return;
    e.preventDefault();
    toast.error("Drag and drop is not allowed during assessment");
  };

  const handleTimeUp = async () => {
    setDisabled(true);
    await submit(true);
  };

  return (
    <main
      className='bg-white flex flex-col min-h-[calc(100svh-7rem-0.75rem)] md:min-h-[calc(100svh-7rem-2rem)]'
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
    >
      <div className='flex items-center justify-between px-3 sm:px-5 gap-3 sm:gap-8'>
        <button onClick={exit}>
          <LuX className='text-sm text-primary-black' />
        </button>
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
                const _timeAlmostUp =
                  minutes < assessmentDurationInMinutes * 0.2;
                if (_timeAlmostUp && !timeAlmostUp) setTimeAlmostUp(true);
              }}
            />
          )}
          <div className='countdown hidden' />
        </div>

        <div />
      </div>

      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center border-b border-[#EAECF0] pb-5 mt-7",
          hasStarted && "mt-3"
        )}
      >
        {!hasStarted ? (
          <div className='md:max-w-[713px] w-full text-center'>
            <p className='text-base font-medium text-secondary-black'>
              CODING TASK
            </p>
            <h2 className='text-2xl md:text-3xl font-semibold mt-3 mb-3 md:mb-4 text-primary-black'>
              {assessment.title}
            </h2>
            {/* <h5 className='text-secondary-black font-medium text-sm md:text-xl'>
                    {assessment.description}
                  </h5> */}

            <div className='flex items-center justify-center gap-2 text-base text-[#9DA3A8] mt-4'>
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
          <>
            {/* On mobile the description is clamped and expandable so it
             * can't eat the whole viewport before the candidate ever
             * reaches the editor -- desktop has enough height to show it
             * in full by default. */}
            <div className='mb-3 w-full'>
              <h2
                className='text-2xl md:text-3xl font-semibold mb-1 text-primary-black text-center select-none'
                onCopy={e => {
                  e.preventDefault();
                  toast.error("Copying assessment content is not allowed");
                }}
                onContextMenu={handleContextMenu}
              >
                {coding_task?.title ?? "No title"}
              </h2>
              <p
                className={cn(
                  "text-base text-secondary-black select-none",
                  !descExpanded && "line-clamp-3 md:line-clamp-none"
                )}
                onCopy={e => {
                  e.preventDefault();
                  toast.error("Copying assessment content is not allowed");
                }}
                onContextMenu={handleContextMenu}
              >
                {coding_task?.description ?? "No description"}
              </p>
              {(coding_task?.description?.length ?? 0) > 140 && (
                <button
                  type='button'
                  onClick={() => setDescExpanded(v => !v)}
                  className='md:hidden mt-1 text-sm font-medium text-primary'
                >
                  {descExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
            <div className='w-full flex-1 rounded-lg border border-[#EAECF0] overflow-hidden'>
              <CodeMirrorEditor
                value={code}
                onPaste={handleCodeMirrorPaste}
                onDrop={handleCodeMirrorDrop}
                onContextMenu={handleContextMenu}
                className='min-h-[300px] h-full w-full'
                onChange={disabled ? undefined : setCode}
                placeholder='Please enter your code.'
              />
            </div>
          </>
        )}
      </div>

      <div className='flex justify-end mt-7'>
        <Button
          loading={submitting}
          onClick={handleOnclick}
          className='btn btn-primary px-8 py-3 w-full sm:max-w-[253px] font-medium'
        >
          {!hasStarted ? "Start Now" : "Submit"}
        </Button>
      </div>
    </main>
  );
};

export default AssessmentCodingTask;
