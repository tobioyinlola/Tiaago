import { getTalentRoles } from "@/app/common/services";
import { getStaffBundles, getStaffQuestionBank } from "@/app/common/services/assessment";
import { handleServerApiCallError } from "@/app/common/utils";
import ScrollArea from "@/app/common/components/ScrollArea";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import BundleModal from "./_components/BundleModal";
import DeleteBundleButton from "./_components/DeleteBundleButton";

export const metadata = {
  title: "Assessment Bundles",
};

const AdminBundlesPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const [roles, bundlesResult, questionBankResult] = await Promise.all([
    getTalentRoles().catch(async e => {
      const error = await handleServerApiCallError(e);
      errors.push({ message: error, title: "Error getting roles" });
      return [];
    }),
    getStaffBundles().catch(async e => {
      const error = await handleServerApiCallError(e);
      errors.push({ message: error, title: "Error getting bundles" });
      return { results: [] };
    }),
    getStaffQuestionBank().catch(async e => {
      const error = await handleServerApiCallError(e);
      errors.push({ message: error, title: "Error getting question bank" });
      return { results: [] };
    }),
  ]);
  const bundles = bundlesResult.results;
  const questionBank = questionBankResult.results;

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Assessment Bundles</h1>
          <BundleModal roles={roles} questionBank={questionBank} />
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Curated question packages recruiters can add to an assessment in one click
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
                    <BundleModal bundle={bundle} roles={roles} questionBank={questionBank} />
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
    </>
  );
};

export default AdminBundlesPage;
