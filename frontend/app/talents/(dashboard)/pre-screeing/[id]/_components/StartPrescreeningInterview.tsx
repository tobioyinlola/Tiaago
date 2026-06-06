"use client";

import Image from "next/image";
import { useState } from "react";
import { addMinutes } from "date-fns";
import ReactCountdown, { zeroPad } from "react-countdown";
import { Countdown as DaisyuiCountdown } from "react-daisyui";

import { cn } from "@/app/common/utils";
import { Talent } from "@/app/common/types";
import UserAvatar from "@/app/common/components/UserAvatar";
import StopWatchIcon from "@/app/common/icons/StopWatchIcon";

const DURATION_IN_MINUTES = 15;

const StartPrescreeningInterview = ({
  currentUser,
}: {
  currentUser: Talent;
  isInQueue?: boolean;
}) => {
  const [isInQueue, setIsInQueue] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [timeAlmostUp, setTimeAlmostUp] = useState(false);
  const [endDateTime, setEndDateTime] = useState<Date>();

  const handleOnclick = () => {
    if (!hasStarted) {
      setHasStarted(true);
      setEndDateTime(addMinutes(new Date(), DURATION_IN_MINUTES));
    } else {
    }
  };

  const stopInterview = () => {
    setHasStarted(false);
    setEndDateTime(undefined);
    setTimeAlmostUp(false);
    setIsInQueue(true);
  };

  return (
    <main className='flex-1 flex flex-col min-h-[calc(100svh-7rem-0.75rem)] md:min-h-[calc(100svh-7rem-2rem)]'>
      <div className='flex items-center px-5 gap-8 justify-between pb-4 border-b border-[#EAECF0]'>
        <div className='flex items-center gap-3'>
          <UserAvatar
            firstName='Artificial'
            lastName='Intelligence'
            className='text-[#B53535] bg-[#FFF0F0] w-14'
          />
          <h6 className='text-base font-medium text-[#2C3E50]'>
            Frontend Developer Interview
          </h6>
        </div>
        <div
          className={cn(
            "bg-[#C0DFF4] rounded-lg px-4 py-2 flex items-center justify-center gap-2 text-xl font-medium text-[#292D32]",
            timeAlmostUp && "bg-[#FFE9B0]"
          )}
        >
          <StopWatchIcon className='text-[#292D32]' />
          {!(hasStarted && endDateTime) ? (
            <h6>{zeroPad(DURATION_IN_MINUTES)}:00</h6>
          ) : (
            <ReactCountdown
              date={endDateTime}
              //   onComplete={submit}
              renderer={({ minutes, seconds }) => (
                <span className='flex items-center'>
                  <DaisyuiCountdown value={minutes} />:
                  <DaisyuiCountdown value={seconds} />
                </span>
              )}
              onTick={({ minutes }) => {
                const _timeAlmostUp = minutes < DURATION_IN_MINUTES * 0.2;
                if (_timeAlmostUp && !timeAlmostUp) setTimeAlmostUp(true);
              }}
            />
          )}
          <div className='countdown hidden' />
        </div>
      </div>

      <div
        className={cn(
          "flex-1 flex flex-col mt-4",
          !hasStarted && "items-center justify-center"
        )}
      >
        {!hasStarted ? (
          <>
            <p className='text-base mb-2 text-[#2C3E50] text-center max-w-lg mx-auto'>
              Hey {currentUser.first_name}, Welcome to Your Pre-Screening
              Interview for the role of a Frontend developer at Tiaago.
            </p>

            <div className='my-6 p-4 border border-[#EAECF0] rounded-xl w-full max-w-lg mx-auto'>
              <h4 className='text-base font-semibold mb-2 text-center'>
                Instructions:
              </h4>
              <ul className='text-sm text-secondary-black list-disc list-inside'>
                <li>
                  Click Start Interview to get started. You must share your
                  screen to attempt the interview. This is to prevent plagiarism
                  during the interview.
                </li>
                <li>
                  You have {DURATION_IN_MINUTES}-minutes to carry out your
                  interview successfully.
                </li>
              </ul>
            </div>

            {!isInQueue ? (
              <div className='flex justify-center'>
                <button className='btn btn-primary' onClick={handleOnclick}>
                  Start Interview
                </button>
              </div>
            ) : (
              <div className='flex flex-col items-center gap-3'>
                <h4 className='text-lg font-medium text-[#2C3E50] text-center max-w-lg mx-auto'>
                  You are in queue for an interview. Please wait for your turn.
                </h4>

                <button
                  className='btn btn-primary mt-3'
                  onClick={() => setIsInQueue(false)}
                >
                  Skip Queue
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className='grid grid-cols-2 gap-4 lg:gap-6'>
              <div className='relative rounded h-[200px] lg:h-[470px] overflow-hidden'>
                <Image
                  src='/assets/images/jane.png'
                  fill
                  className='object-cover rounded'
                  alt='AI Interviewer'
                />
                {/* overlay */}
                <div className='absolute top-0 left-0 right-0 bottom-0 bg-black/20 rounded' />
                <div className='absolute left-0 right-0 bottom-0 px-2 md:px-6 pb-3 flex items-center justify-between'>
                  <h6 className='text-xl font-semibold text-white'>Jane</h6>
                  <SpeakingIllustration />
                  <div />
                </div>
              </div>
              <div className='relative rounded bg-gray-400/80 h-[200px] lg:h-[470px] overflow-hidden'>
                {!!currentUser.profile_pic && (
                  <Image
                    src={currentUser.profile_pic}
                    fill
                    className='object-cover rounded'
                    alt='Interviewee'
                  />
                )}
                {/* overlay */}
                <div className='absolute top-0 left-0 right-0 bottom-0 bg-black/20 rounded' />
                <div className='absolute left-0 right-0 bottom-0 px-2 md:px-6 pb-3 flex items-center justify-between'>
                  <div />
                  <SpeakingIllustration />
                  <h6 className='text-xl font-semibold text-white'>You</h6>
                </div>
              </div>
            </div>

            <div className='flex justify-center mt-6'>
              <button className='btn btn-error' onClick={stopInterview}>
                Stop Interview
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default StartPrescreeningInterview;

const SpeakingIllustration = () => (
  <svg
    width='134'
    height='28'
    viewBox='0 0 134 28'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <rect y='6' width='2' height='16' rx='1' fill='white' />
    <rect x='4' y='7' width='2' height='14' rx='1' fill='white' />
    <rect x='8' y='7' width='2' height='14' rx='1' fill='white' />
    <rect x='12' y='2' width='2' height='24' rx='1' fill='white' />
    <rect x='16' y='6' width='2' height='16' rx='1' fill='white' />
    <rect x='20' y='6' width='2' height='16' rx='1' fill='white' />
    <rect x='24' y='2' width='2' height='24' rx='1' fill='white' />
    <rect x='28' y='4' width='2' height='20' rx='1' fill='white' />
    <rect x='32' y='4' width='2' height='20' rx='1' fill='white' />
    <rect x='36' y='6' width='2' height='16' rx='1' fill='white' />
    <rect x='40' y='6' width='2' height='16' rx='1' fill='white' />
    <rect x='44' y='2' width='2' height='24' rx='1' fill='white' />
    <rect x='48' y='2' width='2' height='24' rx='1' fill='white' />
    <rect x='52' y='6' width='2' height='16' rx='1' fill='white' />
    <rect x='56' y='6' width='2' height='16' rx='1' fill='white' />
    <rect x='60' y='2' width='2' height='24' rx='1' fill='white' />
    <rect x='64' y='6' width='2' height='16' rx='1' fill='white' />
    <rect x='68' y='4' width='2' height='20' rx='1' fill='white' />
    <rect x='72' y='4' width='2' height='20' rx='1' fill='white' />
    <rect x='76' y='2' width='2' height='24' rx='1' fill='white' />
    <rect x='80' y='6' width='2' height='16' rx='1' fill='white' />
    <rect x='84' y='4' width='2' height='20' rx='1' fill='white' />
    <rect x='88' y='5' width='2' height='18' rx='1' fill='white' />
    <rect x='92' y='5' width='2' height='18' rx='1' fill='white' />
    <rect x='96' y='4' width='2' height='20' rx='1' fill='white' />
    <rect x='100' y='4' width='2' height='20' rx='1' fill='white' />
    <rect x='104' width='2' height='28' rx='1' fill='white' />
    <rect x='108' y='4' width='2' height='20' rx='1' fill='white' />
    <rect x='112' y='6' width='2' height='16' rx='1' fill='white' />
    <rect x='116' width='2' height='28' rx='1' fill='white' />
    <rect x='120' y='6' width='2' height='16' rx='1' fill='white' />
    <rect x='124' y='6' width='2' height='16' rx='1' fill='white' />
    <rect x='128' y='2' width='2' height='24' rx='1' fill='white' />
    <rect x='132' y='2' width='2' height='24' rx='1' fill='white' />
  </svg>
);
