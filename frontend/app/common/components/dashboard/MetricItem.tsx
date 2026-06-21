"use client";

import dynamic from "next/dynamic";
import {
  PiArrowDownBold,
  PiArrowUp,
  // PiDotsThreeVerticalBold,
} from "react-icons/pi";
import { BsDash } from "react-icons/bs";

import { isNullOrUndef } from "@/app/common/utils";

const DashboardAreaChart = dynamic(
  () => import("./charts/DashboardAreaChart"),
  { ssr: false, loading: () => <div className="h-[50px]" /> }
);

export type MetricItemProps = {
  title: string;
  data: number[];
  percentChange: number;
  currentVal: number | string;
  valueLastMonth?: number | string;
};

const getColorMap = (percentChange: number) => {
  if (percentChange > 0) {
    return {
      fill: "#12B76A",
      areaFill: "#ECFDF3",
    };
  } else if (percentChange < 0) {
    return {
      fill: "#F04438",
      areaFill: "#FEF3F2",
    };
  } else {
    return {
      fill: "#CBD5E0",
      areaFill: "#F7FAFC",
    };
  }
};

const getIcon = (percentChange: number) => {
  if (percentChange > 0) {
    return PiArrowUp;
  } else if (percentChange < 0) {
    return PiArrowDownBold;
  } else {
    return BsDash;
  }
};

const MetricItem = ({
  title,
  data,
  percentChange,
  currentVal,
  valueLastMonth,
}: MetricItemProps) => {
  const { fill, areaFill } = getColorMap(percentChange);
  return (
    <div className='card card-bordered shadow-sm'>
      <div className='card-body p-6'>
        <div className='mb-6 flex justify-between'>
          <h4 className='text-gray-900 text-base font-medium'>{title}</h4>
          {/* <PiDotsThreeVerticalBold className='text-xl cursor-pointer text-gray-500' /> */}
        </div>
        <div className='flex'>
          <div className='ws-[55%]'>
            <h2 className='text-gray-900 font-space-grotesk text-4xl font-semibold -tracking-[0.72px]'>
              {currentVal}
            </h2>
            <p className='mt-4 flex items-center gap-2 text-sm font-medium text-gray-500'>
              <span
                style={{
                  color: percentChange === 0 ? "#9CA3AF" : fill,
                }}
                className='flex items-center gap-1'
              >
                {percentChange > 0 ? (
                  <PiArrowUp />
                ) : percentChange < 0 ? (
                  <PiArrowDownBold />
                ) : (
                  <BsDash />
                )}
                {Math.abs(percentChange)}%
              </span>
              vs last month
              {!isNullOrUndef(valueLastMonth) && ` (${valueLastMonth})`}
            </p>
          </div>
          <div className='w-2/5 ml-auto flex items-end'>
            <DashboardAreaChart {...{ areaFill, fill, data }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricItem;
