import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

import { getAssessmentResultsList, getCompanyAssessment } from "@/app/common/services/assessment";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError, cn } from "@/app/common/utils";

type Props = {
  params: Promise<{ id: string }>;
};

const statusBadge: Record<string, string> = {
  Marked: "bg-badge-green-bg text-badge-green-text",
  "Awaiting Manual Review": "bg-badge-purple-bg text-badge-purple-text",
  Pending: "bg-[#F5F6F7] text-secondary-black",
  "Failed to Mark": "bg-destructive/10 text-destructive",
};

const initials = (name?: string | null) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("");

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
          <Link
            href={`/recruiter/dashboard/assessments/${id}`}
            className='flex items-center gap-1 text-sm text-secondary-black hover:text-primary'
          >
            <ChevronLeft className='w-4 h-4' />
            Back to assessment
          </Link>
          <h1 className='text-2xl font-semibold font-space-grotesk text-primaryBlack mt-1'>
            Submissions
          </h1>
          <p className='text-secondary-black text-sm'>{assessment.title}</p>
        </div>
      </div>

      {results.length === 0 ? (
        <div className='bg-white rounded-2lg p-16 border border-[#EAECF0] flex flex-col items-center text-center'>
          <div className='w-12 h-12 rounded-full bg-[#F5F6F7] flex items-center justify-center mb-4'>
            <Users className='w-5 h-5 text-secondary-black' />
          </div>
          <p className='font-medium text-primaryBlack'>No submissions yet</p>
          <p className='text-secondary-black text-sm mt-1'>
            Invite candidates from the assessment page to see their submissions here.
          </p>
        </div>
      ) : (
        <div className='bg-white rounded-2lg border border-[#EAECF0] divide-y divide-[#EAECF0] overflow-hidden'>
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
              className='flex items-center justify-between px-6 py-4 hover:bg-[#F8FAFC] transition-colors'
            >
              <div className='flex items-center gap-3 min-w-0'>
                <div className='w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0'>
                  {initials(submission.candidate_name)}
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-medium text-primaryBlack truncate'>
                    {submission.candidate_name || "Unknown candidate"}
                  </p>
                  <p className='text-xs text-secondary-black truncate'>{submission.candidate_email}</p>
                </div>
              </div>
              <div className='flex items-center gap-4 shrink-0'>
                <span className='text-sm font-medium text-primaryBlack'>
                  {submission.total_score !== null ? `${submission.total_score}%` : "--"}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap",
                    statusBadge[submission.mark_status || "Pending"]
                  )}
                >
                  {submission.mark_status}
                </span>
                <ChevronRight className='w-4 h-4 text-secondary-black' />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssessmentSubmissionsPage;
