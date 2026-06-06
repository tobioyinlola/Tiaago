import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import JobList from "../components/JobList";
import { ISearchParams } from "@/app/common/types";
import { getUserCountry } from "@/app/common/utils";
import { getJobs } from "@/app/common/services/jobs";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCurrentUser } from "@/app/common/services/profile";
import ServerPagination from "@/app/common/components/ServerPagination";

export const metadata = {
  title: "Job Search",
};

const JobApplicationsPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const currentUser = (await getCurrentUser("talent")).currentUser;
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string) : 1;
  const roleSearch = resolvedSearchParams.role
    ? (resolvedSearchParams.role as string)
    : undefined;
  const role = roleSearch; // || currentUser.role;
  const location = resolvedSearchParams.location
    ? (resolvedSearchParams.location as string)
    : undefined;
  const jobsRes = await getJobs(page, 10, role, location).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get jobs error (Job search): ", error);
    errors.push({
      message: error,
      title: "Error getting jobs",
    });
    return null;
  });
  const jobs = jobsRes?.results || [];
  const country = await getUserCountry(currentUser);
  return (
    <div className='p-8 max-md:px-1 flex flex-col gap-8'>
      <div className='border-b border-gray-200 pb-1'>
        <h1 className='text-2xl mb-1 font-space-grotesk'>
          Let&apos;s Find you a new, <span className='font-bold'>Job!👋🏻</span>
        </h1>
        <h4 className='text-gray-900 text-base'>
          Thousands of jobs in the computer, engineering and technology sectors
          are waiting for you.
        </h4>
      </div>
      <JobList
        jobs={jobs}
        currentUserCountry={country}
        searchParams={resolvedSearchParams}
        role={role}
        location={location}
        totalJobs={jobsRes?.count || 0}
      />
      {!!jobsRes && <ServerPagination pagedResource={jobsRes} />}
      <DisplayErrorMessages errors={errors} />
    </div>
  );
};

export default JobApplicationsPage;
