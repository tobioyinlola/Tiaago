"use client";

import { useRouter } from "next/navigation";
import ReactCountdown from "react-countdown";
import DaisyCountdown from "@/app/common/components/DaisyCountdown";

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
              <DaisyCountdown value={minutes} />:
              <DaisyCountdown value={seconds} />
            </span>
          )}
        />
      </>
    </ClockDisplay>
  );
};

export default CountDown;
