import { getTalentRoles } from "@/app/common/services";
import { getStaffBundles } from "@/app/common/services/assessment";
import { handleServerApiCallError } from "@/app/common/utils";
import ScrollArea from "@/app/common/components/ScrollArea";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import BundleCsvUploadModal from "./_components/BundleCsvUploadModal";
import DeleteBundleButton from "./_components/DeleteBundleButton";
import ServerPagination from "@/app/common/components/ServerPagination";
import { ISearchParams } from "@/app/common/types";
import AddNewRole from "../../components/AddNewRole";

export const metadata = {
  title: "Assessment Bundles",
};

const AdminBundlesPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page
    ? parseInt(resolvedSearchParams.page as string)
    : 1;
  const page = isNaN(_page) ? 1 : _page;

  const [roles, bundlesResult] = await Promise.all([
    getTalentRoles().catch(async e => {
      const error = await handleServerApiCallError(e);
      errors.push({ message: error, title: "Error getting roles" });
      return [];
    }),
    getStaffBundles({ page }).catch(async e => {
      const error = await handleServerApiCallError(e);
      errors.push({ message: error, title: "Error getting bundles" });
      return null;
    }),
  ]);
  const bundles = bundlesResult?.results ?? [];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Assessment Bundles</h1>
          <div className='flex items-center gap-2'>
            <AddNewRole refresh buttonClassName='btn-primary btn-outline' />
            <BundleCsvUploadModal roles={roles} />
          </div>
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Curated question packages recruiters can add to an assessment in one click -- upload a CSV to create one
        </h4>
      </div>
      <ScrollArea className='border mb-8 rounded dashboard-content-constraint'>
        <table className='table'>
          <thead>
            <tr>
              <th className='max-sm:hidden'>S/N</th>
              <th>Name</th>
              <th>Role</th>
              <th>Difficulty</th>
              <th>Questions</th>
              <th>Recommended</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {bundles.length ? (
              bundles.map((bundle, i) => (
                <tr key={bundle.id}>
                  <td className='max-sm:hidden'>{i + 1}</td>
                  <td>{bundle.name}</td>
                  <td>{bundle.role?.title}</td>
                  <td>{bundle.difficulty_level}</td>
                  <td>{bundle.question_count}</td>
                  <td>{bundle.is_recommended ? "Yes" : "No"}</td>
                  <td className='flex gap-2 items-center'>
                    <DeleteBundleButton id={bundle.id} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <EmptyState text='No bundles yet...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
      {!!bundlesResult && (
        <ServerPagination
          pagedResource={bundlesResult}
          searchParams={resolvedSearchParams}
        />
      )}
    </>
  );
};

export default AdminBundlesPage;
