import { redirect } from "next/navigation";
import "react-quill-new/dist/quill.snow.css";
import "react-phone-input-2/lib/style.css";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import CreateJobForm from "./CreateJobForm";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCurrentUser } from "@/app/common/services/profile";
import { getTeamRole } from "@/app/common/services/team";
import { getCountries, getTalentRoles } from "@/app/common/services";

export const metadata = {
  title: "Post a Job",
  description: "Post a job on the platform",
};

const PostAJob = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const [{ currentUser }, teamRoleData, groupedCountries, talentRoles] = await Promise.all([
    getCurrentUser("startup"),
    getTeamRole().catch(() => null),
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

  if (teamRoleData && teamRoleData.role === "viewer") {
    redirect("/startups/dashboard");
  }

  return (
    <>
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
          Post a Job
        </h1>
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
