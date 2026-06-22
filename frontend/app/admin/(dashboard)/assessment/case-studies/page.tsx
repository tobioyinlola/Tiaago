import "react-quill-new/dist/quill.snow.css";

import { htmlToPlainText } from "@/app/common/utils";
import AddNewRole from "../../components/AddNewRole";
import { getTalentRoles } from "@/app/common/services";
import ScrollArea from "@/app/common/components/ScrollArea";
import CaseStudyModalForm from "./_components/CaseStudyModalForm";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import DeleteCaseStudyModal from "./_components/DeleteCaseStudyModal";
import { getCaseStudyProjects } from "@/app/common/services/case-study";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Case Studies",
};

const CaseStudiesPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const [roles, caseStudies] = await Promise.all([
    getTalentRoles().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get roles error (admin => case studies): ", error);
      errors.push({
        message: error,
        title: "Error getting roles",
      });
      return [];
    }),
    getCaseStudyProjects().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get case studies error (admin => case studies): ", error);
      errors.push({
        message: error,
        title: "Error getting case studies",
      });
      return [];
    }),
  ]);
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            Case Studies
          </h1>
          <div className='flex items-center gap-2'>
            <AddNewRole buttonClassName='btn-primary btn-outline' />
            <CaseStudyModalForm refresh roles={roles} />
          </div>
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly review the Case Studies on the platform
        </h4>
      </div>
      <ScrollArea className='border mb-8 rounded dashboard-content-constraint'>
        <table className='table'>
          {/* head */}
          <thead>
            <tr>
              <th className='max-sm:hidden'>S/N</th>
              <th>Name</th>
              <th>Description</th>
              <th>Roles</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!!caseStudies && caseStudies.length ? (
              caseStudies.map((caseStudy, i) => (
                <tr key={caseStudy.id}>
                  <td className='max-sm:hidden'>{i + 1}</td>
                  <td>{caseStudy.title}</td>
                  <td>
                    <p className='line-clamp-2'>
                      {htmlToPlainText(caseStudy.about)}
                    </p>
                  </td>
                  <td>{caseStudy.role_names.join(", ")}</td>
                  <td className='flex gap-3 items-center'>
                    {/* <Link
                      href={`/admin/assessment/case-studies/${caseStudy.id}`}
                    >
                      <LuExternalLink className='text-base text-[#7F7F7F]' />
                    </Link> */}
                    <CaseStudyModalForm
                      caseStudy={caseStudy}
                      roles={roles}
                      refresh
                      buttonClassName='btn-ghost min-w-fit min-h-fit hover:bg-transparent hovver:border-transparent px-0'
                    />
                    <DeleteCaseStudyModal id={caseStudy.id} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <EmptyState text='There are currently no Case Study Projects...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
      <div className='h-10' />
    </>
  );
};

export default CaseStudiesPage;
