import { notFound } from "next/navigation";

import { getInterviewReview } from "@/app/common/services/interview-review";
import ReviewView from "./_components/ReviewView";

export const metadata = {
  title: "Interview Review",
};

type Props = {
  params: Promise<{ id: string }>;
};

const InterviewReviewPage = async ({ params }: Props) => {
  const { id } = await params;
  const result = await getInterviewReview(id);
  if (!result.success) return notFound();

  return <ReviewView interviewId={id} initialReview={result.data} />;
};

export default InterviewReviewPage;
