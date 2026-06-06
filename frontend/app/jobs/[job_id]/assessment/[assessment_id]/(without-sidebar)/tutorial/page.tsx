import MCQTutorial from "@/app/assessments/_components/AssessmentMCQQuiz/MCQTutorial";

export const metadata = {
  title: "Job Application Assessment Tutorial",
};

const JobApplicationTutorialPage = async ({
  params,
}: {
  params: Promise<{ job_id: string; assessment_id: string }>;
}) => {
  const { job_id, assessment_id } = await params;

  return <MCQTutorial assessmentId={assessment_id} jobId={job_id} />;
};

export default JobApplicationTutorialPage;
