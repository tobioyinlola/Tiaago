import { ISearchParams } from "@/app/common/types";
import StartupsTable from "../components/StartupsTable";
import { getAllStartups } from "@/app/common/services/profile";
import ServerPagination from "@/app/common/components/ServerPagination";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Startups",
};

const StartupsPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string) : 1;
  const search = resolvedSearchParams.q ? (resolvedSearchParams.q as string) : undefined;
  const startups = await getAllStartups(page, true, search).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get startups error (admin startups page): ", error);
    errors.push({
      message: error,
      title: "Error getting startups",
    });
    return null;
  });

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Startups</h1>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly review the Startups posted on the platform
        </h4>
      </div>
      <StartupsTable data={startups?.results || []} />
      {!!startups && (
        <ServerPagination
          pagedResource={startups}
          searchParams={resolvedSearchParams}
        />
      )}
    </>
  );
};

export default StartupsPage;
