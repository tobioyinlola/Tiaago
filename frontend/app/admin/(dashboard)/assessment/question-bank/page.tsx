import { getTalentRoles } from "@/app/common/services";
import { getStaffQuestionBank } from "@/app/common/services/assessment";
import { handleServerApiCallError } from "@/app/common/utils";
import ScrollArea from "@/app/common/components/ScrollArea";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { ISearchParams, TalentQuestionBankEntry } from "@/app/common/types";
import AddQuestionModal from "./_components/AddQuestionModal";
import QuestionBankCsvUploadModal from "./_components/QuestionBankCsvUploadModal";
import GenerateQuestionsModal from "./_components/GenerateQuestionsModal";
import DeleteQuestionButton from "./_components/DeleteQuestionButton";

export const metadata = {
  title: "Question Bank",
};

const previewOf = (entry: TalentQuestionBankEntry) =>
  entry.mcq_question?.question || entry.coding_task?.title || entry.open_ended_question?.question || "—";

const AdminQuestionBankPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams & { role?: string; question_type?: string }>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const role = resolvedSearchParams.role;
  const questionType = resolvedSearchParams.question_type;

  const [roles, questionBank] = await Promise.all([
    getTalentRoles().catch(async e => {
      const error = await handleServerApiCallError(e);
      errors.push({ message: error, title: "Error getting roles" });
      return [];
    }),
    getStaffQuestionBank({ role, question_type: questionType, page_size: 50 }).catch(async e => {
      const error = await handleServerApiCallError(e);
      errors.push({ message: error, title: "Error getting question bank" });
      return null;
    }),
  ]);
  const questions = questionBank?.results ?? [];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Question Bank</h1>
          <div className='flex items-center gap-2'>
            <QuestionBankCsvUploadModal roles={roles} />
            <AddQuestionModal roles={roles} />
            <GenerateQuestionsModal roles={roles} />
          </div>
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Individual questions available to pull into assessment bundles -- add them manually, via CSV, or
          generate them with AI.
        </h4>
      </div>

      <ScrollArea className='border mb-8 rounded dashboard-content-constraint'>
        <table className='table'>
          <thead>
            <tr>
              <th>Question</th>
              <th>Type</th>
              <th>Role</th>
              <th>Difficulty</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {questions.length ? (
              questions.map(entry => (
                <tr key={entry.id}>
                  <td className='max-w-md truncate'>{previewOf(entry)}</td>
                  <td>{entry.question_type?.replace("_", " ")}</td>
                  <td>{entry.role?.title || "—"}</td>
                  <td>{entry.difficulty_level}</td>
                  <td>
                    <DeleteQuestionButton id={entry.id} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <EmptyState text='No questions in the bank yet...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
};

export default AdminQuestionBankPage;
