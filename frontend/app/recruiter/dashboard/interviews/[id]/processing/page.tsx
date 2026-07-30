import ProcessingView from "./_components/ProcessingView";

export const metadata = {
  title: "Processing Interview",
};

type Props = {
  params: Promise<{ id: string }>;
};

const InterviewProcessingPage = async ({ params }: Props) => {
  const { id } = await params;
  return <ProcessingView interviewId={id} />;
};

export default InterviewProcessingPage;
