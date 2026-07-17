import { notFound } from "next/navigation";

import { getAssessmentInviteQuestions } from "@/app/common/services/assessment-invite";
import TakeAssessmentFlow from "../_components/TakeAssessmentFlow";

export const metadata = {
  title: "Take Assessment",
};

type Props = {
  params: Promise<{ token: string }>;
};

const TakeAssessmentPage = async ({ params }: Props) => {
  const { token } = await params;
  const result = await getAssessmentInviteQuestions(token);
  if (!result.success || !result.data.sections.length) return notFound();

  return <TakeAssessmentFlow assessment={result.data} />;
};

export default TakeAssessmentPage;
