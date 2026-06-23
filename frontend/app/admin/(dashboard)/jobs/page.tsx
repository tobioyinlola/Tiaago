import { Metadata } from "next";
import { getJobs } from "@/app/common/services/jobs";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import JobsTable from "../components/JobsTable";

export const metadata: Metadata = {
  title: "Jobs",
};

const JobsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const jobsRes = await getJobs(1, 50).catch(async e => {
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
    </>
  );
};

export default JobsPage;
