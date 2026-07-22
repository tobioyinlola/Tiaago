import Link from "next/link";

import { ISearchParams } from "@/app/common/types";
import AssessmentQuestionsTab from "@/app/recruiter/dashboard/components/JobApplicationGrid/AssessmentQuestionsTab";

type Props = {
  params: Promise<{ submission_id: string }>;
  searchParams: Promise<ISearchParams>;
};

export const metadata = {
  title: "Submission",
};

const asString = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : Array.isArray(value) ? value[0] : "";

const SubmissionDetailPage = async ({ params, searchParams }: Props) => {
  const { submission_id } = await params;
  const resolvedSearchParams = await searchParams;
  const name = asString(resolvedSearchParams.name);
  const email = asString(resolvedSearchParams.email);
  const score = asString(resolvedSearchParams.score);
  const status = asString(resolvedSearchParams.status);
  const assessmentId = asString(resolvedSearchParams.assessmentId);

  return (
    <div className='text-black max-w-5xl'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-medium font-space-grotesk text-primaryBlack'>
            {name || "Candidate submission"}
          </h1>
          <p className='text-[#6C757D] text-sm'>{email}</p>
        </div>
        <div className='flex items-center gap-4'>
          {score && (
            <span className='text-sm font-medium text-primaryBlack'>Score: {score}%</span>
          )}
          {status && (
            <span className='text-xs font-medium px-2 py-[2px] rounded-full bg-[#F5F6F7] text-[#6C757D]'>
              {status}
            </span>
          )}
        </div>
      </div>

      <div className='bg-white rounded-2xl border border-[#EAECF0]'>
        <AssessmentQuestionsTab submissionId={submission_id} />
      </div>

      {assessmentId && (
        <Link
          href={`/recruiter/dashboard/assessments/${assessmentId}/submissions`}
          className='inline-block mt-4 text-sm text-primary font-medium'
        >
          Back to submissions
        </Link>
      )}
    </div>
  );
};

export default SubmissionDetailPage;
