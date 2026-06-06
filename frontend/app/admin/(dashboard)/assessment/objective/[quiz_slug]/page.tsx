import { notFound } from "next/navigation";

import {
  getAssessment,
  getAssessmentQuestions,
} from "@/app/common/services/assessment";
import ScrollArea from "@/app/common/components/ScrollArea";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import ToggleAssessmentStatusModal from "../_components/ToggleAssessmentStatus";
import AssessmentQuestionModalForm from "../_components/AssessmentQuestionModalForm";
import DeleteAssessmentQuestiontModal from "../_components/DeleteAssessmentQuestiontModal";
import DisplayErrorMessages from "@/app/common/components/DisplayErrorMessages";
import { DisplayErrorMessagesProps } from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

type Props = {
  params: Promise<{ quiz_slug?: string }>;
};

export const generateMetadata = async ({ params }: Props) => {
  const { quiz_slug } = await params;
  if (typeof quiz_slug !== "string") return {};
  const assessment = await getAssessment(quiz_slug);
  return {
    title: `${assessment.name} Questions`,
  };
};
const AssessmentQuestionsPage = async ({ params }: Props) => {
  const { quiz_slug } = await params;
  const errors: DisplayErrorMessagesProps["errors"] = [];
  if (typeof quiz_slug !== "string") return notFound();
  const assessment = await getAssessment(quiz_slug).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Get assessment error (admin => objective => questions): ",
      error
    );
    errors.push({
      message: error,
      title: "Error getting assessment",
    });
    return null;
  });
  if (!assessment) return notFound();
  const questions = await getAssessmentQuestions(quiz_slug).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Get assessment questions error (admin => objective => questions): ",
      error
    );
    errors.push({
      message: error,
      title: "Error getting assessment questions",
    });
    return [];
  });
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            {assessment.name} Questions
          </h1>
          <div className='flex items-center gap-2'>
            <AssessmentQuestionModalForm refresh quiz_slug={quiz_slug} />
            <ToggleAssessmentStatusModal {...assessment} />
          </div>
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly review the {assessment.name} questions on the platform
        </h4>
      </div>
      <ScrollArea className='border mb-8 rounded dashboard-content-constraint'>
        <table className='table'>
          {/* head */}
          <thead>
            <tr>
              <th className='max-sm:hidden'>S/N</th>
              <th>Question</th>
              <th>Options</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {questions.length ? (
              questions.map((question, i) => (
                <tr key={question.id}>
                  <td className='max-sm:hidden'>{i + 1}</td>
                  <td>{question.label}</td>
                  <td>
                    {Object.values(question.options)
                      .map((option, i) => `${i + 1}) ${option}`)
                      .join(" ")}
                  </td>
                  <td className='flex gap-3 items-center'>
                    <AssessmentQuestionModalForm
                      question={question}
                      refresh
                      buttonClassName='btn-ghost min-w-fit min-h-fit hover:bg-transparent hovver:border-transparent px-0'
                      quiz_slug={quiz_slug}
                    />
                    <DeleteAssessmentQuestiontModal
                      id={question.id}
                      slug={quiz_slug}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <EmptyState text='There are currently no objective questions...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
};

export default AssessmentQuestionsPage;
