"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { PreparationStrength, PreparationWatchArea } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import { sourceLabel } from "../../../interviews.constants";

const StrengthsWatchAreas = ({
  strengths,
  watchAreas,
}: {
  strengths: PreparationStrength[];
  watchAreas: PreparationWatchArea[];
}) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className='flex flex-col gap-6 h-full'>
      <div className='bg-white border border-[#EAECF0] rounded-2lg p-5'>
        <p className='text-sm font-semibold text-success mb-3'>Strengths identified</p>
        {!strengths?.length ? (
          <p className='text-sm text-secondary-black'>No strengths surfaced yet.</p>
        ) : (
          <div className='flex flex-col gap-3'>
            {strengths.map((s, i) => (
              <div key={i} className='flex items-start gap-2' title={s.evidence || undefined}>
                <span className='w-2 h-2 rounded-full bg-success mt-1.5 shrink-0' />
                <div className='min-w-0'>
                  <p className='text-sm text-primaryBlack'>{s.text}</p>
                  <span className='text-[11px] font-medium text-secondary-black bg-[#F5F6F7] px-2 py-0.5 rounded-full inline-block mt-1'>
                    {sourceLabel[s.source] || s.source}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='bg-white border border-[#EAECF0] rounded-2lg p-5'>
        <p className='text-sm font-semibold text-amber-600 mb-3'>Areas to probe</p>
        {!watchAreas?.length ? (
          <p className='text-sm text-secondary-black'>No watch areas surfaced yet.</p>
        ) : (
          <div className='flex flex-col gap-1'>
            {watchAreas.map((w, i) => (
              <div key={i} className='border-b border-[#F5F6F7] last:border-0 pb-2 last:pb-0'>
                <button
                  type='button'
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className='flex items-start gap-2 w-full text-left py-1.5'
                >
                  <span className='w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0' />
                  <p className='text-sm text-primaryBlack flex-1 min-w-0'>{w.text}</p>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 text-secondary-black shrink-0 mt-1 transition-transform",
                      expanded === i && "rotate-180"
                    )}
                  />
                </button>
                {expanded === i && w.suggested_probe && (
                  <p className='text-xs text-secondary-black bg-amber-50 rounded-lg px-3 py-2 ml-4 mt-1'>
                    {w.suggested_probe}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StrengthsWatchAreas;
