import DisplayErrorMessages, { DisplayErrorMessagesProps } from "@/app/common/components/DisplayErrorMessages";
import { getScenarioReviewQueue } from "@/app/common/services/jobs";
import ScenarioReviewQueue from "./_components/ScenarioReviewQueue";

export const metadata = { title: "Scenario reviews" };

const ScenarioReviewsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const response = await getScenarioReviewQueue().catch(error => {
    errors.push({ title: "Could not load scenario responses", message: error.message });
    return null;
  });
  return <><DisplayErrorMessages errors={errors} /><div className='dashboard-content-constraint flex flex-col gap-6 p-8 max-md:px-1 sm:gap-8'><div><h1 className='font-space-grotesk text-2xl font-semibold'>Scenario reviews</h1><p className='mt-1 text-secondary-black'>Review written role scenarios before candidates move forward.</p></div><ScenarioReviewQueue initialApplications={response?.results || []} /></div></>;
};

export default ScenarioReviewsPage;
