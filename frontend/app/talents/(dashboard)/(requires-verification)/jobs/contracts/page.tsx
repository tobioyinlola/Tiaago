import { getContracts } from "@/app/common/services/contract";
import JobContractsTable from "../components/JobContractsTable";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import ServerPagination from "@/app/common/components/ServerPagination";

export const metadata = {
  title: "Job Contracts",
};

const JobContractsPage = async ({
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
    console.log("Get contracts error (talent contracts page): ", error);
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
      <div className='p-8 max-md:px-1 flex flex-col gap-8'>
        <div className='border-b border-gray-200 pb-1'>
          <h1 className='text-2xl mb-1 font-space-grotesk font-semibold'>
            Contracts
          </h1>
          <h4 className='text-gray-900 text-base'>
            Let&apos;s see your previous and current contracts
          </h4>
        </div>
        <h3 className='text-gray-900 text-lg font-medium'>Contract details</h3>
        <JobContractsTable data={contracts} />
        {!!contractsRes && (
          <ServerPagination
            pagedResource={contractsRes}
            searchParams={resolvedSearchParams}
          />
        )}
      </div>
    </>
  );
};

export default JobContractsPage;
