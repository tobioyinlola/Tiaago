"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import { AtsJob } from "@/app/common/types";
import CustomBadge from "@/app/common/components/CustomBadge";
import ScrollArea from "@/app/common/components/ScrollArea";
import ConvertAtsJobModal from "./ConvertAtsJobModal";

const info = { bg: "#EFF8FF", color: "var(--primary)" };

/** Synced-but-not-yet-posted ATS jobs, shown above the normal paginated
 * Jobs Posted table -- kept as its own small section rather than merged
 * into that table's rows, since the synced list is unpaginated (small
 * volume) while the native table is server-paginated. Renders nothing when
 * there are no synced jobs, so recruiters without an ATS connection see no
 * change on this page. */
const SyncedJobsSection = ({ jobs = [] }: { jobs: AtsJob[] }) => {
  const [convertingJob, setConvertingJob] = useState<AtsJob | null>(null);

  if (!jobs.length) return null;

  return (
    <div className='border rounded my-8 dashboard-content-constraint'>
      <div className='px-4 py-3 border-b bg-[#FAFAFA]'>
        <h3 className='text-sm font-semibold text-[#101828]'>
          Synced from your ATS
        </h3>
        <p className='text-xs text-[#667085]'>
          Not yet posted on Tiaago -- convert a job to bring it (and its synced
          candidates) into your normal hiring workflow.
        </p>
      </div>
      <ScrollArea>
        <table className='table text-sm'>
          <thead>
            <tr>
              <th>Job</th>
              <th>Provider</th>
              <th>Candidates</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody className='text-[#101828]'>
            {jobs.map(job => (
              <tr key={job.id}>
                <td>
                  <h6 className='font-medium'>
                    {job.title || "Untitled role"}
                  </h6>
                  <p className='text-[#667085] text-xs'>{job.location}</p>
                </td>
                <td className='capitalize'>
                  {job.provider.replace(/-.*$/, "")}
                </td>
                <td>
                  <div className='flex items-center gap-1'>
                    <Users className='h-4 w-4' />
                    {job.candidate_count}
                  </div>
                </td>
                <td>
                  <CustomBadge
                    text='Synced'
                    style={{ backgroundColor: info.bg, color: info.color }}
                    fill={info.color}
                    className='font-medium whitespace-nowrap'
                  />
                </td>
                <td>
                  <button
                    type='button'
                    onClick={() => setConvertingJob(job)}
                    className='btn btn-primary btn-sm text-white'
                  >
                    Convert to Job Posting
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
      {convertingJob && (
        <ConvertAtsJobModal
          atsJob={convertingJob}
          onClose={() => setConvertingJob(null)}
        />
      )}
    </div>
  );
};

export default SyncedJobsSection;
