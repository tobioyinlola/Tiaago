"use client";

import { Loader2 } from "lucide-react";

import { Job } from "@/app/common/types";
import { formatDateRange } from "../../_lib/format";

const GenerateStep = ({
  name,
  onNameChange,
  dateFrom,
  dateTo,
  selectedJobs,
  generating,
}: {
  name: string;
  onNameChange: (name: string) => void;
  dateFrom: Date;
  dateTo: Date;
  selectedJobs: Job[];
  generating: boolean;
}) => {
  const estimatedRecords = selectedJobs.reduce((acc, job) => acc + job.no_of_applications, 0);

  if (generating) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-16 rounded-lg border border-dashed border-[#EAECF0] animate-fade-in'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
        <p className='text-sm text-secondary-black'>Generating your report...</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <label className='font-medium text-sm mb-1.5 block'>Report name</label>
        <input
          type='text'
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder='e.g. Q1 Hiring Performance'
          className='w-full input input-bordered border-[#D0D5DD]'
        />
      </div>

      <div className='rounded-xl border border-[#EAECF0] p-4 flex flex-col gap-3 bg-[#FAFAFB]'>
        <h3 className='font-medium text-primaryBlack'>Summary</h3>
        <div className='text-sm text-secondary-black flex flex-col gap-1.5'>
          <p>
            <span className='font-medium text-primaryBlack'>Date range: </span>
            {formatDateRange(dateFrom.toISOString(), dateTo.toISOString())}
          </p>
          <p>
            <span className='font-medium text-primaryBlack'>Roles included: </span>
            {selectedJobs.length ? selectedJobs.map(j => j.title).join(", ") : "None"}
          </p>
          <p>
            <span className='font-medium text-primaryBlack'>Estimated records to process: </span>
            {estimatedRecords}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GenerateStep;
