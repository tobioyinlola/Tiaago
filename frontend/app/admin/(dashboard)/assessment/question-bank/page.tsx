import { getTalentRoles } from "@/app/common/services";
import { getStaffQuestionBank } from "@/app/common/services/assessment";
import { handleServerApiCallError } from "@/app/common/utils";
import ScrollArea from "@/app/common/components/ScrollArea";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import QuestionBankEntryModal from "./_components/QuestionBankEntryModal";
import DeleteQuestionBankEntryButton from "./_components/DeleteQuestionBankEntryButton";

export const metadata = {
  title: "Question Bank",
};

const questionText = (entry: { question_type: string | null; mcq_question: { question: string } | null; coding_task: { title: string; description: string } | null; open_ended_question: { question: string } | null }) => {
  if (entry.question_type === "MCQ") return entry.mcq_question?.question || "";
  if (entry.question_type === "CODING_TASK") return entry.coding_task?.title || "";
  return entry.open_ended_question?.question || "";
};

const AdminQuestionBankPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const [roles, questionBank] = await Promise.all([
    getTalentRoles().catch(async e => {
      const error = await handleServerApiCallError(e);
      errors.push({ message: error, title: "Error getting roles" });
      return [];
    }),
    getStaffQuestionBank().catch(async e => {
      const error = await handleServerApiCallError(e);
      errors.push({ message: error, title: "Error getting question bank" });
      return { results: [] };
    }),
  ]);
  const entries = questionBank.results;

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Question Bank</h1>
          <QuestionBankEntryModal roles={roles} />
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          MCQ, coding, and open-ended questions used to build assessment bundles
        </h4>
      </div>
      <ScrollArea className='border mb-8 rounded dashboard-content-constraint'>
        <table className='table'>
          <thead>
            <tr>
              <th className='max-sm:hidden'>S/N</th>
              <th>Question</th>
              <th>Type</th>
              <th>Role</th>
              <th>Difficulty</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {entries.length ? (
              entries.map((entry, i) => (
                <tr key={entry.id}>
                  <td className='max-sm:hidden'>{i + 1}</td>
                  <td className='max-w-md truncate'>{questionText(entry)}</td>
                  <td>{entry.question_type?.replace("_", " ")}</td>
                  <td>{entry.role?.title || "--"}</td>
                  <td>{entry.difficulty_level}</td>
                  <td className='flex gap-2 items-center'>
                    <QuestionBankEntryModal entry={entry} roles={roles} />
                    <DeleteQuestionBankEntryButton id={entry.id} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <EmptyState text='No question bank entries yet...' />
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
