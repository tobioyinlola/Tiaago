import { Metadata } from "next";
import { getJobs } from "@/app/common/services/jobs";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import JobsContent from "./_components/JobsContent";

export const metadata: Metadata = {
  title: "Jobs",
};

const JobsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
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
      <JobsContent pendingJobs={pendingJobs} approvedJobs={approvedJobs} />
    </>
  );
};

export default JobsPage;
