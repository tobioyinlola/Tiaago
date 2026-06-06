import { notFound } from "next/navigation";

import { getJob } from "@/app/common/services/jobs";
import { getCurrentUser } from "@/app/common/services/profile";
import AssessmentDetails from "@/app/common/components/AssessmentDetails";
import { getCompanyAssessment as getAssessment } from "@/app/common/services/assessment";

export const metadata = {
  title: "Job Application Assessment",
};

const JobApplicationAssessmentLandingPage = async ({
  params,
}: {
  params: Promise<{ job_id: string; assessment_id: string }>;
}) => {
  const { currentUser: user } = await getCurrentUser("talent");
  const resolvedParams = await params;
  const { job_id, assessment_id } = resolvedParams;

  // Verify the job exists
  const job = await getJob(job_id).catch(() => null);
  if (!job) return notFound();

  // Get assessment details
  const assessment = await getAssessment(assessment_id).catch(() => null);
  if (!assessment) return notFound();

  return (
    <>
      <div className='border-b w-full border-[#E6E6E6] pb-1 mb-8'>
        <h1 className='text-2xl font-semibold mb-1 font-switzer text-primary-black'>
          Hi {user.first_name}
        </h1>
        <p className='text-[#636568] text-base'>
          You’ve been invited to take a skill assesemement for the role of{" "}
          {job.role_title} at {job.company?.company_name}, you need to complete
          the assessment before you move the next stage of the vetting process
        </p>
      </div>

      <AssessmentDetails
        assessmentId={assessment_id}
        jobId={job_id}
        mode='job-application'
      />
    </>
  );
};

export default JobApplicationAssessmentLandingPage;
