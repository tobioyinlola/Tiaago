import MCQTutorial from "../../_components/AssessmentMCQQuiz/MCQTutorial";

export const metadata = {
  title: "MCQ Tutorial",
};

const MCQTutorialPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ assessment_id?: string }>;
}) => {
  const { assessment_id } = await searchParams;

  return <MCQTutorial assessmentId={assessment_id} />;
};

export default MCQTutorialPage;
