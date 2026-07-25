import { Metadata } from "next";
import { getJobs } from "@/app/common/services/jobs";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import JobsTable from "../components/JobsTable";
import ServerPagination from "@/app/common/components/ServerPagination";
import { ISearchParams } from "@/app/common/types";

export const metadata: Metadata = {
  title: "Jobs",
};

const JobsPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page
    ? parseInt(resolvedSearchParams.page as string)
    : 1;
  const page = isNaN(_page) ? 1 : _page;

  const jobsRes = await getJobs(page, 20).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get jobs error (admin jobs page): ", error);
    errors.push({
      message: error,
      title: "Error getting jobs",
    });
    return null;
  });
  const jobs = jobsRes?.results || [];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Jobs</h1>
        <h4 className='text-gray-900 text-sm md:text-base'>
          All jobs posted on the platform
        </h4>
      </div>
      <JobsTable jobs={jobs} dataType="approved" />
      {!!jobsRes && (
        <ServerPagination
          pagedResource={jobsRes}
          searchParams={resolvedSearchParams}
        />
      )}
    </>
  );
};

export default JobsPage;
