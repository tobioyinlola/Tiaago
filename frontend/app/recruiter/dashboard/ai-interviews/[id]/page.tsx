import { notFound } from "next/navigation";

import { getRecruiterAIInterviewDetail } from "@/app/common/services/ai-interviews";
import AIInterviewReviewView from "./_components/AIInterviewReviewView";

export const metadata = {
  title: "AI Interview Review",
};

type Props = { params: Promise<{ id: string }> };

const AIInterviewReviewPage = async ({ params }: Props) => {
  const { id } = await params;
  const result = await getRecruiterAIInterviewDetail(id);
  if (!result.success) return notFound();

  return <AIInterviewReviewView interviewId={id} initialDetail={result.data} />;
};

export default AIInterviewReviewPage;
