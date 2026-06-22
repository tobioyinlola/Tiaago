"use client";

import { useState } from "react";
import { LuX } from "react-icons/lu";
import { addMinutes } from "date-fns";
import { BsDot } from "react-icons/bs";
import { useRouter } from "next/navigation";
import ReactCountdown, { zeroPad } from "react-countdown";
import Button from "@/app/common/components/DaisyButton";
import DaisyCountdown from "@/app/common/components/DaisyCountdown";

import { cn } from "@/app/common/utils";
import { ID, MCQAnswer, MCQSection } from "@/app/common/types";
import NotesIcon from "@/app/common/icons/NotesIcon";
import StopWatchIcon from "@/app/common/icons/StopWatchIcon";
import { useMultiStep } from "@/app/common/store/useMultiStep";
import { mcqInstructions } from "../../constants/mcq.constants";
import { useAlert } from "@/app/common/store/useAlert";

const duration_minutes = 10;
const mcqSection: MCQSection = {
  id: 1,
  name: "MCQ Section",
  mcq_questions: [
    {
      id: 1,
      is_ai_generated: false,
      question: "What is tailwindcss?",
      options: [
        { index: 1, label: "A CSS framework" },
        { index: 2, label: "A JavaScript library" },
        { index: 3, label: "A React component library" },
        { index: 4, label: "A tool for generating CSS" },
      ],
      correct_option_index: 1,
    },
    {
      id: 2,
      is_ai_generated: false,
      question: "What is the default prefix for tailwind classes?",
      options: [
        { index: 1, label: "tw-" },
        { index: 2, label: "tl-" },
        { index: 3, label: "t-" },
        { index: 4, label: "tailwind-" },
      ],
      correct_option_index: 1,
    },
    {
      id: 3,
      is_ai_generated: false,
      question:
        "What is the name of the tailwind utility class for setting the background color of an element?",
      options: [
        { index: 1, label: "bg-color" },
        { index: 2, label: "background-color" },
        { index: 3, label: "bg" },
        { index: 4, label: "backgroundColor" },
      ],
      correct_option_index: 2,
    },
    {
      id: 4,
      is_ai_generated: false,
      question:
        "What is the name of the tailwind utility class for setting the font size of an element?",
      options: [
        { index: 1, label: "text-size" },
        { index: 2, label: "font-size" },
        { index: 3, label: "text" },
        { index: 4, label: "fontSize" },
      ],
      correct_option_index: 2,
    },
    {
      id: 5,
      is_ai_generated: false,
      question:
        "What is the name of the tailwind utility class for setting the margin of an element?",
      options: [
        { index: 1, label: "margin" },
        { index: 2, label: "m" },
        { index: 3, label: "spacing" },
        { index: 4, label: "space" },
      ],
      correct_option_index: 1,
    },
  ],
  coding_task: null,
  question_count: 5,
  type: "MCQ",
};

const question_count = mcqSection.question_count;
const maxStepIndex = question_count - 1;

const MCQTutorial = ({ assessmentId = "", jobId = "" }) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const [hasStarted, setHasStarted] = useState(false);
  const [timeAlmostUp, setTimeAlmostUp] = useState(false);
  const [endDateTime, setEndDateTime] = useState<Date>();
  const [activeOption, setActiveOption] = useState<number>();
  const [answers, setAnswers] = useState<MCQAnswer[]>([]);
  const { step: activeStepIndex, nextStep, setStep, prevStep } = useMultiStep();

  const activeQuestionStepIndex = Math.max(activeStepIndex - 6, 0);
  const activeQuestion = mcqSection.mcq_questions[activeQuestionStepIndex];
  const isAtLastStep = activeStepIndex === maxStepIndex + 5;

  const exit = () => {
    setStep(0);
    router.push(
      `/${jobId ? `jobs/${jobId}` : "talents"}/assessments/${
        assessmentId ? assessmentId : ""
      }`
    );
  };

  const goToPrevQuestion = () => prevStep();

  const handleOnclick = () => {
    nextStep(6);
    if (activeStepIndex === 3 && !hasStarted) {
      setHasStarted(true);
      setEndDateTime(addMinutes(new Date(), duration_minutes));
    }
  };

  const submit = (mcq_id: ID, selected_option_index: number) => {
    const _answers = [
      ...answers.filter(ans => ans.mcq_id !== mcq_id),
      {
        mcq_id: mcq_id,
        selected_option_index,
      },
    ];
    setAnswers(_answers);
  };

  const handleButtonClick = (index?: number) => {
    const _index = index || activeOption;
    if (activeStepIndex < 5) return;
    if (!hasStarted) {
      setHasStarted(true);
      setEndDateTime(addMinutes(new Date(), duration_minutes));
      nextStep(maxStepIndex + 5);
    } else if (isAtLastStep) {
      // show success modal
      setAlert({
        title: "Success",
        message: "You have successfully completed the assessment",
        icon: "success",
        buttonText: "Exit",
        buttonAction: () => {
          exit();
        },
        buttonClassName: "btn-primary text-white",
      });
    } else if (typeof _index === "number") {
      submit(activeQuestion.id, _index);
      nextStep(maxStepIndex + 5);
      setActiveOption(undefined);
    }
  };

  return (
    <main className='bg-white flex flex-col min-h-[calc(100svh-7rem-0.75rem)] md:min-h-[calc(100svh-7rem-2rem)]'>
      <div className='flex items-center px-5 gap-4 md:gap-8'>
        <button onClick={exit}>
          <LuX className='text-sm text-primary-black' />
        </button>
        <div className='relative h-6 flex-1'>
          <progress
            className='progress progress-primary h-6 bg-transparent z-[2] rounded-md [&::-webkit-progress-value]:rounded-md [&::-moz-progress-bar]:rounded-md'
            value={((activeQuestionStepIndex + 1) / question_count) * 100}
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
              width: `${
                ((activeQuestionStepIndex + 1) / question_count) * 100
              }%`,
            }}
          >
            {activeQuestionStepIndex + 1}/{question_count}
          </p>

          <TutorialToolTip
            text={
              "This element shows your progress through the assessment by indicating the number of questions you've answered out of the total number. For example, \"0/10\" means you haven't answered any of the 10 questions yet."
            }
            onClick={handleOnclick}
            className={cn(
              "absolute top-9 left-0 z-[4]",
              activeStepIndex && "hidden"
            )}
          />
        </div>
        <div
          className={cn(
            "bg-[#C0DFF4] rounded-lg md:px-4 p-2 flex items-center justify-center gap-2 relative text-base md:text-xl font-medium text-[#292D32]",
            timeAlmostUp && "bg-[#FFE9B0]"
          )}
        >
          <StopWatchIcon className='text-[#292D32]' />
          {!(hasStarted && endDateTime) ? (
            <h6>{zeroPad(duration_minutes)}:00</h6>
          ) : (
            <ReactCountdown
              date={endDateTime}
              renderer={({ minutes, seconds }) => (
                <span className='flex items-center'>
                  <DaisyCountdown value={minutes} />:
                  <DaisyCountdown value={seconds} />
                </span>
              )}
              onTick={({ minutes }) => {
                const _timeAlmostUp = minutes < duration_minutes * 0.2;
                if (_timeAlmostUp && !timeAlmostUp) setTimeAlmostUp(true);
              }}
            />
          )}
          <div className='countdown hidden' />
          <TutorialToolTip
            text='The timer is displayed in the top right corner, showing the time remaining for the assessment. In this example, the timer starts at 10 minutes. Be mindful of the clock to ensure you complete all the questions within the allotted time.'
            onClick={handleOnclick}
            className={cn(
              "absolute top-[52px] right-0 z-[4] items-end",
              activeStepIndex !== 1 && "hidden"
            )}
          />
        </div>
      </div>

      <div className='flex-1 flex flex-col items-center justify-center border-b border-[#EAECF0] pb-4 mt-6'>
        {!hasStarted ? (
          <div className='md:max-w-[713px] w-full text-center'>
            <p className='text-base font-medium text-secondary-black'>
              MULTIPLE-CHOICE QUESTIONS
            </p>
            <h2 className='text-2xl md:text-3xl font-semibold mt-7 mb-3 md:mb-4 text-primary-black'>
              Introduction to Tailwind CSS Basics
            </h2>

            <div className='flex items-center justify-center gap-2 text-base text-[#9DA3A8] mt-4'>
              <NotesIcon size={22} />
              <p className='text-sm'>{question_count ?? 0} questions</p>
              <BsDot aria-hidden />
              <StopWatchIcon />
              <p className='text-sm'>{duration_minutes} minutes</p>
            </div>

            <div className='mt-10 mb-5 divider text-base text-secondary-black w-full relative'>
              Before you start
              <TutorialToolTip
                text='This section provides important instructions and guidelines that you should follow before starting the assessment.'
                onClick={handleOnclick}
                className={cn(
                  "absolute top-0 right-0 z-[4] flex-col-reverse -translate-y-[100%] md:translate-x-[50%]",
                  activeStepIndex !== 2 && "hidden"
                )}
                arrowClassName='rotate-180'
              />
            </div>
            <div className='grid md:grid-cols-2 gap-y-6 gap-x-9 text-left'>
              {mcqInstructions(!!jobId).map(({ Icon, text }) => (
                <div className='flex gap-3 items-start' key={text}>
                  <Icon
                    size={24}
                    className='text-2xl text-[##141B34] shrink-0'
                  />
                  <h6 className='text-base font-medium text-secondary-black'>
                    {text}
                  </h6>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className='w-full'>
            <div className='relative'>
              <h2 className='text-2xl text-primary-black font-semibold text-center'>
                {activeQuestion.question}
              </h2>
              <TutorialToolTip
                text='The question is displayed prominently in the center of the screen, providing the main prompt that needs to be answered.'
                onClick={handleOnclick}
                className={cn(
                  "absolute top-10 right-0 z-[4] items-center left-0",
                  activeStepIndex !== 4 && "hidden"
                )}
              />
            </div>
            <div className='mt-6 md:mt-11 flex flex-col gap-6 relative'>
              {activeQuestion.options.map(({ index, label }) => (
                <button
                  key={`question-${activeQuestion.id}-option-${index}`}
                  onClick={() => {
                    setActiveOption(+index);
                    if (!isAtLastStep) handleButtonClick(+index);
                    else submit(activeQuestion.id, index);
                  }}
                  className={cn(
                    "cursor-pointer flex items-center justify-between gap-2 px-6 py-3 rounded-lg border-[#EAECF0] border-2 hover:border-primary",
                    answers.at(activeQuestionStepIndex)
                      ?.selected_option_index === +index && "border-primary"
                  )}
                >
                  <h6 className='text-primary-black text-base font-medium'>
                    {label}
                  </h6>
                  <p className='text-secondary-black text-sm font-medium'>
                    {index}
                  </p>
                </button>
              ))}

              <TutorialToolTip
                text='The answer options are listed on the right side of the screen. Each option is a possible answer to the question, and they are typically arranged in a vertical list. You can select the option that you believe is correct by clicking on it.'
                onClick={handleOnclick}
                className={cn(
                  "absolute top-[78px] right-0 z-[4] items-center",
                  activeStepIndex !== 5 && "hidden"
                )}
              />
            </div>
          </div>
        )}
      </div>

      <div className='flex justify-between mt-6 relative'>
        <Button
          onClick={goToPrevQuestion}
          disabled={!hasStarted || activeStepIndex < 7}
          className='btn btn-primary btn-outline px-8 py-3 flex-1 sm:max-w-[253px] font-medium disabled:text-white'
        >
          Previous
        </Button>
        <Button
          onClick={() => handleButtonClick()}
          disabled={hasStarted && typeof activeOption !== "number"}
          className='btn btn-primary px-8 py-3 w-full sm:max-w-[253px] font-medium disabled:text-white'
        >
          {!hasStarted ? "Start Now" : !isAtLastStep ? "Next" : "Finish"}
        </Button>

        <TutorialToolTip
          text={`The "Start Now" button is the prompt to begin the assessment. Once you have reviewed the instructions and are ready, click this button to proceed to the first question of the assessment. This action will initiate the timer and the assessment officially begins.`}
          onClick={handleOnclick}
          className={cn(
            "absolute -top-3 right-0 z-[4] flex-col-reverse items-center -translate-y-[100%]",
            activeStepIndex !== 3 && "hidden"
          )}
          arrowClassName='rotate-180'
        />
      </div>
    </main>
  );
};

export default MCQTutorial;

const TutorialToolTip = ({
  onClick,
  text,
  className,
  arrowClassName,
}: {
  text: string;
  className?: string;
  arrowClassName?: string;
  onClick: VoidFunction;
}) => {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='42'
        height='36'
        viewBox='0 0 42 36'
        fill='none'
        className={arrowClassName}
      >
        <path
          d='M16.0015 3.52807C18.3751 -0.0467303 23.6249 -0.0467303 25.9985 3.52807L40.7932 25.8099C43.4412 29.798 40.5818 35.1288 35.7947 35.1288H6.20529C1.41818 35.1288 -1.44119 29.798 1.2068 25.8099L16.0015 3.52807Z'
          fill='#3C48B5'
        />
      </svg>

      <div className='bg-[#3C48B5] rounded-lg py-3 px-4 w-[340px] flex flex-col'>
        <p
          className='text-white text-sm font-medium text-left'
          //   @ts-ignore
          style={{ textWrap: "wrap" }}
        >
          {text}
        </p>

        <button
          type='button'
          onClick={onClick}
          className='btn btn-sm rounded-lg border-primary h-9 mt-8 w-fit'
        >
          Got it
        </button>
      </div>
    </div>
  );
};
