import Link from "next/link";
import { Fragment } from "react";
import { capitalize } from "lodash";

import { cn } from "@/app/common/utils";
import { jobSubLinks } from "../constants/nav";
import JobsTable from "../components/JobsTable";
import { getJobs } from "@/app/common/services/jobs";
import ServerPagination from "@/app/common/components/ServerPagination";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

const getTab = (tab: string = "pending") => {
  if (!jobSubLinks.map(t => t.href.split("tab=").pop()).includes(tab))
    tab = "pending";
  return tab;
};

export const generateMetadata = async ({ searchParams }: Props) => {
  const resolvedSearchParams = await searchParams;
  let tab = getTab(resolvedSearchParams.tab);
  if (tab.endsWith("s")) tab = tab.slice(0, tab.length - 1);
  return { title: `${capitalize(tab)} Jobs` };
};

type Props = {
  searchParams: Promise<{
    tab?: string;
  }>;
};

const JobsPage = async ({ searchParams }: Props) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const tab = getTab(resolvedSearchParams.tab);
  const jobsRes = await getJobs().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get jobs error (admin jobs page): ", error);
    errors.push({
      message: error,
      title: "Error getting jobs",
    });
    return null;
  });
  const jobs = jobsRes?.results || [];
  const pendingJobs = jobs.filter(job => !job.was_approved);
  const approvedJobs = jobs.filter(job => job.was_approved);
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Jobs</h1>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly review the jobs posted on the platform
        </h4>
      </div>
      {/* Tabs */}
      <div role='tablist' className='tabs tabs-bordered pb-8'>
        {jobSubLinks.map(({ name: label, href }) => {
          const name = href.split("tab=").pop();
          return (
            <Fragment key={name}>
              <Link
                href={`?tab=${name}`}
                role='tab'
                className={cn(
                  "tab !border-gray-200 text-sm font-medium text-gray-500 !w-max",
                  name === tab && "tab-active !border-primary text-primary"
                )}
                aria-label={label}
              >
                <span className='md:hidden capitalize'>{name}</span>
                <span className='max-md:hidden'>{label}</span>
              </Link>
              <div
                role='tabpanel'
                className='tab-content py-8 border-0 border-t-2 border-gray-200 w-full max-w-[90svw]'
              >
                <JobsTable
                  dataType={name as any}
                  jobs={name === "pending" ? pendingJobs : approvedJobs}
                />
                {!!jobsRes && <ServerPagination pagedResource={jobsRes} />}
              </div>
            </Fragment>
          );
        })}
      </div>
    </>
  );
};

export default JobsPage;
