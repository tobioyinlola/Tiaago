"use client";

import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { PiMapPinLine } from "react-icons/pi";

import JobCard from "./JobCard";
import { ISearchParams, Job } from "@/app/common/types";
// import JobFilters from "./JobFilters";
import JobDetailsCard from "./JobDetailsCard";
import { cn, isRecentJob } from "@/app/common/utils";
import { useRouter } from "next/navigation";

type JobListProps = {
  jobs: Job[];
  currentUserCountry: string;
  searchParams: ISearchParams;
  role?: string;
  location?: string;
  totalJobs: number;
};

type Filter = {
  role: string;
  location: string;
};

const JobList = ({
  jobs,
  currentUserCountry,
  searchParams,
  role,
  location,
  totalJobs,
}: JobListProps) => {
  const router = useRouter();
  const [selectedJob, setSelectedJob] = useState<Job>();
  const [filters, setFilters] = useState<Filter>({
    location: location || "",
    role: role || "",
  });
  const setFilter = (filterKey: keyof Filter, value: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const _searchParams = new URLSearchParams(searchParams as any);
    _searchParams.set("role", filters.role);
    _searchParams.set("location", filters.location);
    _searchParams.set("page", "1");
    router.push(`/talents/jobs/search?${_searchParams.toString()}`);
  };

  return (
    <>
      {/* Search */}
      <form
        onSubmit={handleSearch}
        className='flex items-center w-full font-dm-sans'
      >
        <div className='relative flex-[0.8] md:flex-[0.45]'>
          <FiSearch
            className='absolute left-3 top-1/2 -translate-y-1/2 text-[#14141480] text-2xl'
            aria-hidden
          />
          <input
            type='text'
            placeholder='What position are you looking for?'
            className='input input-bordered pl-12 w-full text-base rounded-r-none placeholder:text-[#14141480] focus:outline-none bg-white dark:bg-white'
            onChange={e => setFilter("role", e.target.value)}
            value={filters.role}
          />
        </div>
        <div className='relative max-md:hidden flex-[0.45]'>
          <PiMapPinLine
            className='absolute left-3 top-1/2 -translate-y-1/2 text-[#14141480] text-2xl'
            aria-hidden
          />
          <input
            type='text'
            placeholder='Location'
            className='input input-bordered pl-12 w-full text-base rounded-none border-x-0 placeholder:text-[#14141480] focus:outline-none'
            onChange={e => setFilter("location", e.target.value)}
            value={filters.location}
          />
        </div>
        <button
          type='submit'
          className='btn btn-primary text-base flex-[0.2] md:flex-[0.1] rounded-l-none font-medium'
        >
          Search Job
        </button>
      </form>

      <h3 className='text-gray-900 text-lg font-medium max-md:hidden'>
        Job Details
      </h3>
      <TotalJobs count={totalJobs} className='md:hidden' />
      <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
        {/* <div className={cn("max-md:hidden", selectedJob && "hidden")}>
          <JobFilters searchParams={{}} />
        </div> */}
        <div
          className={cn(
            "md:col-span-3 px-1 flex flex-col gap-4 max-md:order-2",
            selectedJob && "md:col-span-2"
          )}
        >
          <div className='flex items-center justify-between max-md:hidden'>
            <TotalJobs count={totalJobs} />
            {/* <div className='relative'>
              <PiFunnelSimple
                className='absolute left-3 top-1/2 -translate-y-1/2 text-[#141414] text-2xl'
                aria-hidden
              />
              <select
                name='job-filter'
                className='select select-bordered pl-10 w-full max-w-xs text-[#141414] text-base'
                value={filters.filterBy || ""}
                onChange={e =>
                  applyFilters({
                    filterBy: e.target.value as Filter["filterBy"],
                  })
                }
              >
                <option disabled value=''>
                  Filter by
                </option>
                <option value='all'>All</option>
                <option value='new'>New</option>
                <option value='remote'>Remote</option>
              </select>
            </div> */}
          </div>

          {jobs.map(job => (
            <JobCard
              key={job.id}
              {...job}
              selected={job.id == selectedJob?.id}
              setSelectedJob={setSelectedJob}
            />
          ))}

          {jobs.length ? (
            !jobs.length && (
              <h4 className='text-center text-gray-500 text-xl font-medium'>
                No job matches the search criteria.
              </h4>
            )
          ) : (
            <h4 className='text-center text-gray-500 text-xl font-medium'>
              There are currently no open jobs. Check again in a few minutes.
            </h4>
          )}
        </div>
        {!!selectedJob && (
          <div className='max-md:order-1'>
            <JobDetailsCard {...selectedJob} setSelectedJob={setSelectedJob} />
            <div className='md:hidden mt-6'>
              <h3 className='text-gray-900 text-lg font-bold'>Other Jobs</h3>
              <div className='divider mt-5 mb-6' />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default JobList;

const TotalJobs = ({ count = 0, className = "" }) => (
  <h2
    className={cn(
      "text-[#141414] font-space-grotesk text-4xl text-[32px] font-bold",
      className
    )}
  >
    {count} Job{count !== 1 ? "s" : ""}
  </h2>
);
