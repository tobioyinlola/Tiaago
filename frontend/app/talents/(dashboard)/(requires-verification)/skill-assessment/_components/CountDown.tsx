"use client";

import { useRouter } from "next/navigation";
import ReactCountdown from "react-countdown";
import { Countdown as DaisyuiCountdown } from "react-daisyui";

import ClockDisplay from "./ClockDisplay";

const CountDown = ({ date }: { date: Date }) => {
  const router = useRouter();
  const quitQuiz = () => {
    router.push("/talents/skill-assessment/unique-id/result");
  };

  return (
    <ClockDisplay>
      <>
        <div className='countdown hidden' />
        <ReactCountdown
          date={date}
          onComplete={() => quitQuiz()}
          renderer={({ minutes, seconds }) => (
            <span>
              <DaisyuiCountdown value={minutes} />:
              <DaisyuiCountdown value={seconds} />
            </span>
          )}
        />
      </>
    </ClockDisplay>
  );
};

export default CountDown;
