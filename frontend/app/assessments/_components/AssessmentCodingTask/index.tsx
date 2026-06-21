"use client";

import { toast } from "sonner";
import { useState } from "react";
import { LuX } from "react-icons/lu";
import { addMinutes } from "date-fns";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const CodeMirrorEditor = dynamic(() => import("./CodeMirrorEditor"), {
  ssr: false,
  loading: () => <div className="h-[400px] animate-pulse bg-gray-100 rounded" />,
});
import ReactCountdown, { zeroPad } from "react-countdown";
import { Countdown as DaisyuiCountdown, Button } from "react-daisyui";

import {
  cn,
  handleFormSubmissionError,
  getAssessmentDurationInMinutes,
} from "@/app/common/utils";
import { useAlert } from "@/app/common/store/useAlert";
import StopWatchIcon from "@/app/common/icons/StopWatchIcon";
import { mcqInstructions } from "../../constants/mcq.constants";
import { CodingTaskSection, CompanySkillAssessment } from "@/app/common/types";
import { attemptCompanyAssessmentCodeSection } from "@/app/common/services/assessment";
import { useAssessmentSecurity } from "@/app/common/hooks/useAssessmentSecurity";

const AssessmentCodingTask = ({
  codeSection,
  assessment,
  checkoutUrl,
  mode = "talent-verification",
  jobId,
  onComplete,
}: {
  codeSection: CodingTaskSection;
  assessment: CompanySkillAssessment;
  checkoutUrl?: string;
  mode?: "talent-verification" | "job-application";
  jobId?: string;
  onComplete?: () => void;
}) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const [hasStarted, setHasStarted] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeAlmostUp, setTimeAlmostUp] = useState(false);
  const [endDateTime, setEndDateTime] = useState<Date>();
  const [code, setCode] = useState("\n".repeat(10));
  const assessmentDurationInMinutes = getAssessmentDurationInMinutes(
    assessment,
    true
  );

  // Enable assessment security measures
  useAssessmentSecurity();

  const submit = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await attemptCompanyAssessmentCodeSection(
        assessment.id,
        codeSection.id,
        [
          {
            user_answer: code,
            coding_task_id: codeSection.coding_tasks?.at(0)?.id!,
          },
        ]
      );
      if (!res.success) {
        throw Error(res.error);
      }
      toast.success("Your score has been recorded");

      // Handle different completion flows based on mode
      if (mode === "job-application") {
        if (onComplete) {
          onComplete();
        } else {
          // Redirect to job application results
          window.location.href = `/jobs/${jobId}/assessment/${assessment.id}/results?tab=coding_task`;
        }
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
    await submit();
  };

  return (
    <main
      className='bg-white flex flex-col min-h-[calc(100svh-7rem-0.75rem)] md:min-h-[calc(100svh-7rem-2rem)]'
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
    >
      <div className='flex items-center justify-between px-5 gap-8'>
        <button onClick={exit}>
          <LuX className='text-sm text-primary-black' />
        </button>
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
            {/* show instructions here */}
            <div className='mb-3'>
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
                className='text-base text-secondary-black select-none'
                onCopy={e => {
                  e.preventDefault();
                  toast.error("Copying assessment content is not allowed");
                }}
                onContextMenu={handleContextMenu}
              >
                {coding_task?.description ?? "No description"}
              </p>
            </div>
            <CodeMirrorEditor
              value={code}
              onPaste={handleCodeMirrorPaste}
              onDrop={handleCodeMirrorDrop}
              onContextMenu={handleContextMenu}
              className='min-h-[300px] w-full flex-1'
              onChange={disabled ? undefined : setCode}
              placeholder='Please enter your code.'
            />
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
