"use client";
import ReactCountdown from "react-countdown";
import DaisyCountdown from "@/app/common/components/DaisyCountdown";

import ClockDisplay from "@/app/talents/(dashboard)/(requires-verification)/skill-assessment/_components/ClockDisplay";

const CountDown = ({ date }: { date: Date }) => {
  return (
    <ClockDisplay className='max-md:flex-col'>
      <>
        <div className='countdown hidden' />
        <ReactCountdown
          date={date}
          renderer={({ days, hours, minutes, seconds }) => (
            <div className='grid grid-flow-col gap-5 text-center auto-cols-max'>
              <CountDownItem label='days' value={days} />:
              <CountDownItem label='hours' value={hours} />:
              <CountDownItem label='min' value={minutes} />:
              <CountDownItem label='sec' value={seconds} />
            </div>
          )}
        />
      </>
    </ClockDisplay>
  );
};

const CountDownItem = ({ value, label }: { value: number; label: string }) => (
  <div className='flex flex-col text-lg md:text-2xl'>
    <DaisyCountdown
      className='text-xl md:text-3xl xl:text-5xl'
      value={value}
    />
    {label}
  </div>
);

export default CountDown;
