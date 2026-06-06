import { getAllTalents } from "@/app/common/services/profile";
import TalentApplicationsTable from "../../components/TalentApplicationsTable";
import ServerPagination from "@/app/common/components/ServerPagination";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Talent Applications",
};

type TalentApplicationsPageProps = {
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
};

const TalentApplicationsPage = async ({
  searchParams,
}: TalentApplicationsPageProps) => {
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string) : 1;
  const search = resolvedSearchParams.q ? (resolvedSearchParams.q as string) : undefined;
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const pagedTalents = await getAllTalents(page, null, search).catch(
    async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get talents error (admin talent applications page): ", error);
      errors.push({
        message: error,
        title: "Error getting talents",
      });
      return null;
    }
  );
  const talents = pagedTalents?.results || [];
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
          Talent Applications
        </h1>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly go through your talent applications
        </h4>
      </div>
      <TalentApplicationsTable data={talents} />
      {!!pagedTalents && (
        <ServerPagination
          pagedResource={pagedTalents}
          searchParams={resolvedSearchParams}
        />
      )}
    </>
  );
};

export default TalentApplicationsPage;
