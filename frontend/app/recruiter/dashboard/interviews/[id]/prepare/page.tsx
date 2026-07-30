import { notFound } from "next/navigation";

import { getInterviewPreparation } from "@/app/common/services/interview-preparation";
import PreparationView from "./_components/PreparationView";

export const metadata = {
  title: "Interview Preparation",
};

type Props = {
  params: Promise<{ id: string }>;
};

/** Server-rendered first paint of the AI interview-prep brief -- the initial
 * fetch happens here so there's real content (or at least a real header) on
 * first load instead of a client-only spinner; PreparationView then takes
 * over polling/editing once mounted. */
const InterviewPreparationPage = async ({ params }: Props) => {
  const { id } = await params;
  const initialData = await getInterviewPreparation(id).catch(e => {
    console.log("Get interview preparation error (prepare page): ", e?.message);
    return null;
  });
  if (!initialData) return notFound();

  return <PreparationView interviewId={id} initialData={initialData} />;
};

export default InterviewPreparationPage;
