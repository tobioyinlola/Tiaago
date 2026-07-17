import { notFound } from "next/navigation";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import { getPublicJobByPublicId } from "@/app/common/services/jobs";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCompanyAssessment } from "@/app/common/services/assessment";
import AssessmentResults from "@/app/assessments/_components/AssessmentResults";

export const metadata = {
  title: "Job Application Assessment - Results",
};

const JobApplicationResultsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ job_id: string; assessment_id: string }>;
  searchParams: Promise<{ tab: string }>;
}) => {
  const resolvedParams = await params;
  const { tab } = await searchParams;
  const { job_id, assessment_id } = resolvedParams;

  const errors: DisplayErrorMessagesProps["errors"] = [];

  // Verify the job exists
  const job = await getPublicJobByPublicId(job_id).catch(async e => {
    const error = await handleServerApiCallError(e);
    errors.push({
      message: error,
      title: "Error getting job",
    });
    return null;
  });
  if (!job) return notFound();

  // Get assessment details
  const assessment = await getCompanyAssessment(assessment_id).catch(
    async e => {
      const error = await handleServerApiCallError(e);
      errors.push({
        message: error,
        title: "Error getting assessment",
      });
      return null;
    }
  );
  if (!assessment) return notFound();

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <AssessmentResults
        assessment={assessment}
        mode='job-application'
        jobId={job_id}
        tab={tab === "coding_task" ? "coding_task" : "mcq"}
        jobRole={job.role_title}
      />
    </>
  );
};

export default JobApplicationResultsPage;
