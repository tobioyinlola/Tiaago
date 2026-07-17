import { notFound } from "next/navigation";

import { getPublicJobByPublicId } from "@/app/common/services/jobs";
import { getCompanyAssessment } from "@/app/common/services/assessment";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import AssessmentMCQQuiz from "@/app/assessments/_components/AssessmentMCQQuiz";
import { MCQSection } from "@/app/common/types";

export const metadata = {
  title: "Job Application Assessment - MCQ",
};

const JobApplicationMCQPage = async ({
  params,
}: {
  params: Promise<{ job_id: string; assessment_id: string }>;
}) => {
  const resolvedParams = await params;
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

  const mcqSection = assessment.sections.find(s => s.type === "MCQ");
  if (!mcqSection) return notFound();

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <AssessmentMCQQuiz
        mcqSection={mcqSection as MCQSection}
        assessment={assessment}
        mode='job-application'
        jobId={job_id}
      />
    </>
  );
};

export default JobApplicationMCQPage;
