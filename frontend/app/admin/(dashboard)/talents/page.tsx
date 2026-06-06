import TalentsTable from "../components/TalentsTable";
import { getAllTalents } from "@/app/common/services/profile";
import ServerPagination from "@/app/common/components/ServerPagination";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Talents",
};

const TalentsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string) : 1;
  const pagedTalents = await getAllTalents(page, null).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get talents error (admin talents page): ", error);
    errors.push({
      message: error,
      title: "Error getting talents",
    });
    return null;
  });
  const talents = pagedTalents?.results || [];
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Talents</h1>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly review the Talents posted on the platform
        </h4>
      </div>
      <TalentsTable data={talents} />
      {!!pagedTalents && <ServerPagination pagedResource={pagedTalents} />}
    </>
  );
};

export default TalentsPage;
