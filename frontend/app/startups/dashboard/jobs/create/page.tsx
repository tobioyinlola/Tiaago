import Link from "next/link";
import "react-quill-new/dist/quill.snow.css";
import "react-phone-input-2/lib/style.css";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import CreateJobForm from "./CreateJobForm";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCurrentUser } from "@/app/common/services/profile";
import { getCountries, getTalentRoles } from "@/app/common/services";

export const metadata = {
  title: "Post a Job",
  description: "Post a job on the platform",
};

const PostAJob = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const [{ currentUser }, groupedCountries, talentRoles] = await Promise.all([
    getCurrentUser("startup"),
    getCountries().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get countries error (post a job): ", error);
      errors.push({
        message: error,
        title: "Error getting countries",
      });
      return [];
    }),
    getTalentRoles().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get talent roles error (post a job): ", error);
      errors.push({
        message: error,
        title: "Error getting talent roles",
      });
      return [];
    }),
  ]);

  return (
    <>
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            Job-listing
          </h1>
          <Link
            href='/startups/dashboard/jobs/jobs-posted'
            className='btn btn-primary font-medium text-base max-sm:btn-sm'
          >
            View Jobs Posted
          </Link>
        </div>
        {/* <h4 className='text-gray-900 text-base'>
          Kindly provide details of the job
        </h4> */}
      </div>
      <CreateJobForm
        talentRoles={talentRoles}
        groupedCountries={groupedCountries}
        startupCountry={currentUser.country}
      />
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default PostAJob;
