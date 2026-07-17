"use client";

import { AlertTriangle } from "lucide-react";

/** Persistent (non-dismissable) top banner, shown once the candidate's tab
 * switches cross the job's warning threshold. */
const ProctoringViolationBanner = ({ count }: { count: number }) => (
  <div className='sticky top-0 z-40 flex items-center justify-center gap-2 bg-warning/15 px-4 py-2.5 text-center text-sm font-medium text-warning'>
    <AlertTriangle className='h-4 w-4 shrink-0' />
    You have left this window {count} time{count === 1 ? "" : "s"}. Further violations may result in your assessment
    being flagged.
  </div>
);

export default ProctoringViolationBanner;
