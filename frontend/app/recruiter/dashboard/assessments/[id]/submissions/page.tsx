import Link from "next/link";
import { notFound } from "next/navigation";

import { getAssessmentResultsList, getCompanyAssessment } from "@/app/common/services/assessment";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

type Props = {
  params: Promise<{ id: string }>;
};

const statusBadge: Record<string, string> = {
  Marked: "bg-[#EAFAF1] text-[#2ABA67]",
  "Awaiting Manual Review": "bg-[#FFF7E6] text-[#B7791F]",
  Pending: "bg-[#F5F6F7] text-[#6C757D]",
  "Failed to Mark": "bg-[#FFEDED] text-[#FF4A4A]",
};

const AssessmentSubmissionsPage = async ({ params }: Props) => {
  const { id } = await params;
  const errors: DisplayErrorMessagesProps["errors"] = [];

  const assessment = await getCompanyAssessment(id).catch(async e => {
    const error = await handleServerApiCallError(e);
    errors.push({ message: error, title: "Error getting assessment" });
    return null;
  });
  if (!assessment) return notFound();

  const { results } = await getAssessmentResultsList(id).catch(async e => {
    const error = await handleServerApiCallError(e);
    errors.push({ message: error, title: "Error getting submissions" });
    return { results: [] };
  });

  return (
    <div className='text-black max-w-5xl'>
      <DisplayErrorMessages errors={errors} />
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-medium font-space-grotesk text-primaryBlack'>
            Submissions
          </h1>
          <p className='text-[#6C757D] text-sm'>{assessment.title}</p>
        </div>
        <Link
          href={`/recruiter/dashboard/assessments/${id}`}
          className='text-sm text-primary font-medium'
        >
          Back to assessment
        </Link>
      </div>

      {results.length === 0 ? (
        <div className='bg-white rounded-2xl p-10 border border-[#EAECF0] text-center text-sm text-[#6C757D]'>
          No candidates have submitted this assessment yet.
        </div>
      ) : (
        <div className='bg-white rounded-2xl border border-[#EAECF0] divide-y divide-[#EAECF0]'>
          {results.map(submission => (
            <Link
              key={submission.id}
              href={{
                pathname: `/recruiter/dashboard/assessments/submissions/${submission.id}`,
                query: {
                  name: submission.candidate_name || "",
                  email: submission.candidate_email || "",
                  score: submission.total_score ?? "",
                  status: submission.mark_status || "",
                  assessmentId: id,
                },
              }}
              className='flex items-center justify-between px-6 py-4 hover:bg-[#F8FAFC]'
            >
              <div>
                <p className='text-sm font-medium text-primaryBlack'>
                  {submission.candidate_name || "Unknown candidate"}
                </p>
                <p className='text-xs text-[#9DA3A8]'>{submission.candidate_email}</p>
              </div>
              <div className='flex items-center gap-4'>
                <span className='text-sm text-primaryBlack'>
                  {submission.total_score !== null ? `${submission.total_score}%` : "--"}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-[2px] rounded-full ${
                    statusBadge[submission.mark_status || "Pending"]
                  }`}
                >
                  {submission.mark_status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssessmentSubmissionsPage;
