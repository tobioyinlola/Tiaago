import { Flag } from "lucide-react";

import { CareerTimelineEntry } from "@/app/common/types";
import { cn } from "@/app/common/utils";

const CareerTimeline = ({ timeline }: { timeline: CareerTimelineEntry[] }) => {
  return (
    <div className='bg-white border border-[#EAECF0] rounded-2lg p-5 h-full'>
      <p className='text-sm font-semibold text-primaryBlack mb-4'>Career history</p>

      {!timeline?.length ? (
        <p className='text-sm text-secondary-black py-6 text-center'>
          Not enough resume detail to build a timeline.
        </p>
      ) : (
        <div className='overflow-x-auto pb-2'>
          <div className='flex items-start gap-0 min-w-max'>
            {timeline.map((entry, index) => {
              const isCurrent = index === timeline.length - 1;
              return (
                <div key={index} className='flex items-start'>
                  <div className='flex flex-col items-center w-40 shrink-0'>
                    <p className='text-xs font-semibold text-primaryBlack text-center truncate w-full'>
                      {entry.company || "Unknown company"}
                    </p>
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full my-2 border-2 border-white shadow",
                        isCurrent ? "bg-success" : "bg-primary"
                      )}
                    />
                    <p className='text-xs text-primaryBlack text-center truncate w-full'>
                      {entry.role || "Unknown role"}
                    </p>
                    <p className='text-[11px] text-secondary-black text-center'>
                      {entry.date} {entry.duration ? `· ${entry.duration}` : ""}
                    </p>
                  </div>

                  {index < timeline.length - 1 &&
                    (entry.gap ? (
                      <div className='flex flex-col items-center w-20 shrink-0 pt-[26px]'>
                        <div className='w-full border-t-2 border-dashed border-amber-400' />
                        <div className='flex items-center gap-1 mt-1'>
                          <Flag className='w-3 h-3 text-amber-500' />
                          <span className='text-[10px] text-amber-600 whitespace-nowrap'>
                            {entry.gap_duration || "Gap"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className='w-10 shrink-0 pt-[26px]'>
                        <div className='w-full border-t-2 border-[#EAECF0]' />
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerTimeline;
