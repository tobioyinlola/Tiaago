"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@/app/common/utils";
import { Job, ID } from "@/app/common/types";
import { ReportType } from "@/app/common/types/reports.type";

const JOB_STATUS_BADGE_STYLES: Record<Job["job_status"], string> = {
  DRAFT: "bg-[#F5F5F5] text-[#667085]",
  ACTIVE: "bg-[#ECFDF3] text-[#027A48]",
  ON_HOLD: "bg-[#FFFAEB] text-[#B54708]",
  HIRED: "bg-[#EEF4FF] text-[#3580B5]",
  EXPIRED: "bg-[#FFEDED] text-[#B53535]",
};

const RoleSelectionStep = ({
  jobs,
  reportType,
  selectedJobIds,
  onSelectionChange,
}: {
  jobs: Job[];
  reportType: ReportType;
  selectedJobIds: ID[];
  onSelectionChange: (ids: ID[]) => void;
}) => {
  const [search, setSearch] = useState("");
  const filtered = jobs.filter(j => j.title.toLowerCase().includes(search.toLowerCase()));

  const toggleJob = (id: ID) => {
    if (reportType === "SINGLE_ROLE") {
      onSelectionChange([id]);
      return;
    }
    onSelectionChange(
      selectedJobIds.includes(id) ? selectedJobIds.filter(existing => existing !== id) : [...selectedJobIds, id]
    );
  };

  const selectAll = () => onSelectionChange(filtered.map(j => j.id));
  const clearAll = () => onSelectionChange([]);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='relative flex-1 max-w-sm'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <input
            type='text'
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Search roles...'
            className='w-full pl-9 input input-bordered border-[#D0D5DD] input-sm'
          />
        </div>
        {reportType === "MULTI_ROLE" && (
          <div className='flex items-center gap-3'>
            <span className='text-sm text-secondary-black'>
              {selectedJobIds.length} {selectedJobIds.length === 1 ? "role" : "roles"} selected
            </span>
            <button type='button' onClick={selectAll} className='btn btn-outline btn-sm'>
              Select all
            </button>
            {selectedJobIds.length > 0 && (
              <button type='button' onClick={clearAll} className='btn btn-outline btn-sm'>
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      <div className='flex flex-col gap-2 max-h-[420px] overflow-y-auto'>
        {filtered.length === 0 ? (
          <p className='text-sm text-secondary-black text-center py-8'>No roles found.</p>
        ) : (
          filtered.map(job => {
            const checked = selectedJobIds.includes(job.id);
            return (
              <label
                key={job.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors duration-200 hover:border-primary/40",
                  checked ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <input
                  type={reportType === "SINGLE_ROLE" ? "radio" : "checkbox"}
                  name='role_selection'
                  checked={checked}
                  onChange={() => toggleJob(job.id)}
                  className={reportType === "SINGLE_ROLE" ? "radio radio-primary radio-sm" : "checkbox checkbox-primary checkbox-sm"}
                />
                <div className='flex-1 min-w-0'>
                  <p className='font-medium text-primaryBlack truncate'>{job.title}</p>
                  <p className='text-xs text-secondary-black'>
                    Posted {new Date(job.date_created).toLocaleDateString()} &middot; {job.no_of_applications}{" "}
                    {job.no_of_applications === 1 ? "candidate" : "candidates"}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", JOB_STATUS_BADGE_STYLES[job.job_status])}>
                  {job.job_status}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RoleSelectionStep;
