import PostJobBtn from "../components/PostJobBtn";
import { getContracts } from "@/app/common/services/contract";
import { EmployedTalentsTable } from "../components/TalentDetailsTable";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import ServerPagination from "@/app/common/components/ServerPagination";

export const metadata = {
  title: "Talents",
};

const HiredTalentsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams?.page
    ? parseInt(resolvedSearchParams.page as string, 10)
    : 1;
  const page = Number.isNaN(_page) ? 1 : _page;

  const contractsRes = await getContracts(page).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get contracts error (hired talents page): ", error);
    errors.push({
      message: error,
      title: "Error getting contracts",
    });
    return null;
  });
  const contracts = contractsRes?.results || [];
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            Talents
          </h1>
          <PostJobBtn />
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Manage the talents on your team
        </h4>
      </div>
      <h3 className='my-8 text-lg font-medium text-gray-900'>
        Employed Talents
      </h3>
      <EmployedTalentsTable data={contracts} />
      {!!contractsRes && (
        <ServerPagination
          pagedResource={contractsRes}
          searchParams={resolvedSearchParams}
        />
      )}
    </>
  );
};

export default HiredTalentsPage;
