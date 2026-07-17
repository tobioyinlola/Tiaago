import { ISearchParams } from "@/app/common/types";
import { getAllRecruiters } from "@/app/common/services/profile";
import ServerPagination from "@/app/common/components/ServerPagination";
import RecruiterApplicationsTable from "../../components/RecruiterApplicationsTable";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Recruiter Applications",
};

const RecruiterApplicationsPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string) : 1;
  const search = resolvedSearchParams.q ? (resolvedSearchParams.q as string) : undefined;
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const recruiters = await getAllRecruiters(page, null, search).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get recruiters error (admin recruiter applications page): ", error);
    errors.push({
      message: error,
      title: "Error getting recruiters",
    });
    return null;
  });
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
          Recruiter Applications
        </h1>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly go through your Recruiter applications
        </h4>
      </div>
      <RecruiterApplicationsTable data={recruiters?.results || []} />
      {!!recruiters && (
        <ServerPagination
          pagedResource={recruiters}
          searchParams={resolvedSearchParams}
        />
      )}
    </>
  );
};

export default RecruiterApplicationsPage;
