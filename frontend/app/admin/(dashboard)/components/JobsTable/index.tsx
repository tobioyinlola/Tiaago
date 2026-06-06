import Link from "next/link";
import { format } from "date-fns";

import { Job } from "@/app/common/types";
import { DeactivateJob } from "../ApproveJob";
import { cn, jobTypeEnumToLabel } from "@/app/common/utils";
import SearchBar from "@/app/common/components/SearchBar";
import ScrollArea from "@/app/common/components/ScrollArea";
import UserAvatar from "@/app/common/components/UserAvatar";
import CustomBadge from "@/app/common/components/CustomBadge";
import EmptyState from "@/app/common/components/dashboard/EmptyState";

type BaseProps = {
  jobs: Job[];
  dataType?: "pending" | "approved";
  className?: string;
};

const BaseTable = ({
  jobs = [],
  dataType = "pending",
  className,
}: BaseProps) => {
  return (
    <>
      <ScrollArea
        className={cn(
          "border mb-8 border-t-0 rounded-b-lg dashboard-content-constraint",
          className
        )}
      >
        <table className='table table-zebra text-sm'>
          {/* head */}
          <thead>
            <tr>
              <th className='max-sm:hidden'>Job ID</th>
              <th>Startup</th>
              <th>Job Title</th>
              <th>Country</th>
              <th>Date Posted</th>
              <th>Job Type</th>
              <th />
            </tr>
          </thead>
          <tbody className='text-[#101828]'>
            {jobs.length ? (
              jobs.map(job => (
                <tr key={job.id}>
                  <td className='max-sm:hidden'>{job.id}</td>
                  <td className='flex items-center gap-2'>
                    <UserAvatar
                      profilePic={job.company.logo}
                      firstName={job.company.company_name}
                      lastName={job.company.company_name.split(" ").at(1) ?? ""}
                      className='w-10'
                    />
                    <div className='font-medium'>
                      <h6>{job.company.company_name}</h6>
                      <Link
                        href={job.company.website}
                        target='_blank'
                        referrerPolicy='no-referrer'
                        className='text-[#667085] line-clamp-1 hover:text-primary'
                      >
                        {job.company.website}
                      </Link>
                    </div>
                  </td>
                  <td>{job.title}</td>
                  <td>{job.location}</td>
                  <td>
                    <div className='font-medium'>
                      <h6>
                        {format(new Date(job.date_created), "MMM dd, yyyy")}
                      </h6>
                      <p className='text-[#667085]'>
                        {format(new Date(job.date_created), "hh:mm a")}
                      </p>
                    </div>
                  </td>
                  <td>
                    <CustomBadge
                      text={jobTypeEnumToLabel(job.job_type)}
                      className='capitalize'
                    />
                  </td>
                  <td className='flex items-center gap-1 justify-center'>
                    {dataType !== "pending" && (
                      <DeactivateJob
                        id={job.id}
                        deactivated={!job.was_approved}
                      />
                    )}
                    <Link
                      href={`jobs/${job.id}`}
                      className='btn btn-primary btn-sm btn-link no-underline'
                    >
                      {dataType === "pending" ? "Review" : "View"}
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    text={`There are currently no ${dataType} jobs...`}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
};

const JobsTable = (props: BaseProps) => {
  const className =
    "select select-sm select-bordered text-[#2E2E2E] font-medium join-item focus:outline-none";
  return (
    <>
      <div className='w-full pl-6 pr-2 py-[14px] bg-[#D9DDFF] mb-8 flex max-sm:flex-col sm:items-center gap-1 justify-between'>
        <SearchBar />
        <div className='border-l flex items-center join'>
          <select className={className} defaultValue=''>
            <option disabled value=''>
              Filter
            </option>
          </select>
          <select className={className} defaultValue=''>
            <option disabled value=''>
              From
            </option>
          </select>
          <select className={className} defaultValue=''>
            <option disabled value=''>
              To
            </option>
          </select>
        </div>
      </div>
      <BaseTable
        {...props}
        className={cn("border-t rounded", props.className)}
      />
    </>
  );
};

export default JobsTable;
