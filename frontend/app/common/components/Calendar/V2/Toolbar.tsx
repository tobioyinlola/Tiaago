import type { CalendarDate } from "@yet3/use-calendar";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";

import { cn } from "../../../utils";
import { CalendarView } from "./calendar.types";

const btnClass =
  "md:btn md:btn-ghost md:shadow shadow-[rgba(38,51,77,0.03)] group rounded-full border-[#F5F6F7] text-[#C3CAD9] aspect-square border-[#F5F6F7] md:border-2";

type ToolbarProps = {
  view: CalendarView;
  views: CalendarView[];
  setView: (v: CalendarView) => void;
  calendarDate: CalendarDate;
  getLabel: () => string;
  isSingleView?: boolean;
};

const getUnitFromView = (view: CalendarView) => {
  switch (view) {
    case "week":
      return "weeks";
    case "day":
      return "days";

    default:
      return "months";
  }
};

const Toolbar = ({
  setView,
  view,
  views,
  calendarDate,
  getLabel,
  isSingleView = false,
}: ToolbarProps) => {
  const next = () => {
    calendarDate.add(1, getUnitFromView(view));
  };
  const prev = () => {
    calendarDate.subtract(1, getUnitFromView(view));
  };
  return (
    <div className='flex justify-between items-center mb-4 gap-1'>
      <button
        onClick={() => calendarDate.set(new Date())}
        className='md:btn md:btn-ghost rounded-full text-xs md:px-5 md:shadow shadow-[rgba(38,51,77,0.03)] md:border-2 font-black font-roboto text-[#6B7A99] border-[#F5F6F7]'
      >
        Today
      </button>
      <div className='flex items-center gap-3 md:gap-8'>
        <button onClick={prev} className={btnClass}>
          <BiChevronLeft className='text-3xl flex-shrink-0 group-hover:text-[#6B7A99]' />
        </button>
        <p className='text-[#6B7A99] text-xs font-bold font-roboto max-md:hidden'>
          {getLabel()}
        </p>
        <button onClick={next} className={btnClass}>
          <BiChevronRight className='text-3xl flex-shrink-0 group-hover:text-[#6B7A99]' />
        </button>
      </div>
      {isSingleView ? (
        <div />
      ) : (
        <div className='join'>
          {views.map((v, i, arr) => (
            <button
              key={v}
              className={cn(
                "btn btn-ghost border-[#F5F6F7] text-[#ADB8CC] text-xs font-roboto font-black hover:bg-[#6B7A99] capitalize border-2 join-item",
                i === 0 && "rounded-l-full pl-5",
                i === arr.length - 1 && "rounded-r-full pr-5",
                v === view && "text-[#6B7A99] hover:bg-[#ADB8CC]"
              )}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Toolbar;
