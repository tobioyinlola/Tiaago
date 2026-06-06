import Link from "next/link";
import { LuExternalLink } from "react-icons/lu";

import AddNewRole from "../../components/AddNewRole";
import { getTalentRoles } from "@/app/common/services";
import ScrollArea from "@/app/common/components/ScrollArea";
import StatusBadge from "@/app/common/components/StatusBadge";
import { getAssessments } from "@/app/common/services/assessment";
import AssessmentModalForm from "./_components/AssessmentModalForm";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import DeleteAssessmentModal from "./_components/DeleteAssessmentModal";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Assessment Objective",
};

const AssessmentObjectivesPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const roles = await getTalentRoles().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get roles error (admin => objective): ", error);
    errors.push({
      message: error,
      title: "Error getting roles",
    });
    return [];
  });
  const assessments = await getAssessments().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get assessments error (admin => objective): ", error);
    errors.push({
      message: error,
      title: "Error getting assessments",
    });
    return [];
  });
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            Objective
          </h1>
          <div className='flex items-center gap-2'>
            <AddNewRole refresh buttonClassName='btn-primary btn-outline' />
            <AssessmentModalForm refresh roles={roles} />
          </div>
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly review the objective questions on the platform
        </h4>
      </div>
      <ScrollArea className='border mb-8 rounded dashboard-content-constraint'>
        <table className='table'>
          {/* head */}
          <thead>
            <tr>
              <th className='max-sm:hidden'>S/N</th>
              <th>Name</th>
              <th>Minutes</th>
              <th>Questions</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {assessments.length ? (
              assessments.map((assessment, i) => (
                <tr key={assessment.id}>
                  <td className='max-sm:hidden'>{i + 1}</td>
                  <td>{assessment.name}</td>
                  <td>{assessment.minutes}</td>
                  <td>{assessment.question_count}</td>
                  <td>
                    <StatusBadge
                      status={assessment.roll_out ? "active" : "on_hold"}
                      hideDot
                    />
                  </td>
                  <td className='flex gap-3 items-center'>
                    <AssessmentModalForm
                      assessment={assessment}
                      roles={roles}
                      refresh
                      buttonClassName='btn-ghost min-w-fit min-h-fit hover:bg-transparent hovver:border-transparent px-0'
                    />
                    <Link
                      href={`/admin/assessment/objective/${assessment.slug}`}
                      className='w-fit'
                    >
                      <LuExternalLink className='text-xl text-[#7F7F7F]' />
                    </Link>
                    <DeleteAssessmentModal slug={assessment.slug} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <EmptyState text='There are currently no objective assessments...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
};

export default AssessmentObjectivesPage;
