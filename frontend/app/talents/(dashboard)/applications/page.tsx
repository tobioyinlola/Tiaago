import { getJobApplications } from "@/app/common/services/jobs";
import ServerPagination from "@/app/common/components/ServerPagination";
import RecentlyAppliedTable from "@/app/talents/(dashboard)/components/RecentlyAppliedTable";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Applications",
};

const ApplicationsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const applicationsRes = await getJobApplications().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Get job appications error (talent applications page): ",
      error
    );
    errors.push({
      message: error,
      title: "Error getting job appications",
    });
    return null;
  });
  const applications = applicationsRes?.results || [];
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-semibold mb-1 font-switzer'>
          Applications
        </h1>
        <h4 className='text-[#636568] text-base'>
          Let&apos;s see your previous and current applications
        </h4>
      </div>
      <h3 className='text-[#101828] text-lg font-medium font-inter mb-8'>
        Job Applications Details
      </h3>
      <RecentlyAppliedTable isApplicationsPage data={applications} />
      {!!applicationsRes && (
        <ServerPagination pagedResource={applicationsRes} />
      )}
    </>
  );
};

export default ApplicationsPage;
