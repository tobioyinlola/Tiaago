import Link from "next/link";
import { LuExternalLink } from "react-icons/lu";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import {
  getCompanyAssessments,
  getAssessmentStacks,
} from "@/app/common/services/assessment";

import {
  getAssessmentDifficultyLevel,
  getNoOfAssementQuestions,
  handleServerApiCallError,
} from "@/app/common/utils";
import { ISearchParams } from "@/app/common/types";
import AddNewRole from "../../components/AddNewRole";
import { getTalentRoles } from "@/app/common/services";
import ScrollArea from "@/app/common/components/ScrollArea";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import ServerPagination from "@/app/common/components/ServerPagination";
import UploadMcqAssessmentModal from "./_components/UploadMcqAssessmentModal";
import CreateCodeAssessmentModal from "./_components/CreateCodeAssessmentModal";

export const metadata = {
  title: "Company Assessments",
};

const CompanyAssessmentsPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string) : 1;
  const page = isNaN(_page) ? 1 : _page;
  const [assessmentsRes, assessmentStacksRes, roles] = await Promise.all([
    getCompanyAssessments(page).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log(
        "Get assessments error (admin => company assessments): ",
        error
      );
      errors.push({
        message: error,
        title: "Error getting assessments",
      });
      return null;
    }),
    getAssessmentStacks(1, 100).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log(
        "Get assessment stacks error (admin => company assessments): ",
        error
      );
      errors.push({
        message: error,
        title: "Error getting assessment stacks",
      });
      return null;
    }),
    getTalentRoles().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get roles error (admin => company assessments): ", error);
      errors.push({
        message: error,
        title: "Error getting roles",
      });
      return [];
    }),
  ]);

  const assessmentStacks = assessmentStacksRes?.results || [];

  const assessments = assessmentsRes?.results || [];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex max-sm:flex-col-reverse sm:items-center sm:justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            Assessments
          </h1>
          <div className='flex items-center gap-2'>
            <AddNewRole refresh buttonClassName='btn-primary btn-outline' />
            <UploadMcqAssessmentModal talentRoles={roles} />
          </div>
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly review the assessments on the platform
        </h4>
      </div>
      <ScrollArea className='border mb-8 rounded dashboard-content-constraint'>
        <table className='table'>
          {/* head */}
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Minutes</th>
              <th>Questions</th>
              <th>Difficulty Level</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {assessments.length ? (
              assessments.map((assessment, i) => (
                <tr key={assessment.id}>
                  <td>{assessment.id}</td>
                  <td>{assessment.title}</td>
                  <td>{assessment.duration_minutes}</td>
                  <td>{getNoOfAssementQuestions(assessment)}</td>
                  <td>
                    {getAssessmentDifficultyLevel(assessment.difficulty_level)}
                  </td>
                  <td className='flex gap-3 items-center'>
                    {/* <AssessmentModalForm
                      assessment={assessment}
                      roles={roles}
                      refresh
                      buttonClassName='btn-ghost min-w-fit min-h-fit hover:bg-transparent hovver:border-transparent px-0'
                    /> */}
                    {/* <Link
                      href={`/assessments/${assessment.id}/mcq`}
                      className='w-fit'
                    >
                      <LuExternalLink className='text-xl text-[#7F7F7F]' />
                    </Link> */}
                    {/* <DeleteAssessmentModal slug={assessment.slug} /> */}
                    {!assessment.sections.some(
                      section => section.type === "CODING_TASK"
                    ) && (
                      <CreateCodeAssessmentModal
                        assessment={assessment}
                        assessmentStacks={assessmentStacks}
                      />
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <EmptyState text='There are currently no company assessments...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
      {!!assessmentsRes && (
        <ServerPagination
          pagedResource={assessmentsRes}
          searchParams={resolvedSearchParams}
        />
      )}
    </>
  );
};

export default CompanyAssessmentsPage;
