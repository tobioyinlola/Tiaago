import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import { getCurrentUser } from "@/app/common/services/profile";
import StartPrescreeningInterview from "./_components/StartPrescreeningInterview";

export const metadata = {
  title: "Pre-screening interview",
};

const PreScreeningInterviewPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const currentUser = (await getCurrentUser("talent")).currentUser;
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <StartPrescreeningInterview currentUser={currentUser} isInQueue={true} />
    </>
  );
};

export default PreScreeningInterviewPage;
