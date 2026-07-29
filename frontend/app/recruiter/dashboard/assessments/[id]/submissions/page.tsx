import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";

import { getAssessmentResultsList, getCompanyAssessment } from "@/app/common/services/assessment";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import SubmissionsList from "./_components/SubmissionsList";

type Props = {
  params: Promise<{ id: string }>;
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
        <SubmissionsList
          assessmentId={id}
          submissions={results}
          requiresApproval={!!assessment.display_review_and_approve_responses}
        />
      )}
    </div>
  );
};

export default AssessmentSubmissionsPage;
