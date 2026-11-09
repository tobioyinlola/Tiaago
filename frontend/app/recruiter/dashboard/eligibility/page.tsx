import { ClipboardCheck } from "lucide-react";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getEligibilityReviewQueue } from "@/app/common/services/jobs";
import EligibilityReviewQueue from "./_components/EligibilityReviewQueue";

export const metadata = {
  title: "Eligibility reviews",
};

const EligibilityReviewPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const response = await getEligibilityReviewQueue().catch(error => {
    errors.push({ message: error.message, title: "Could not load eligibility reviews" });
    return null;
  });
  const applications = response?.results || [];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='dashboard-content-constraint flex flex-col gap-6 p-8 max-md:px-1 sm:gap-8'>
        <div className='flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4'>
          <div>
            <h1 className='mb-1 font-space-grotesk text-2xl font-semibold'>Eligibility reviews</h1>
            <p className='text-base text-gray-900'>
              Review required work, licence, safety, and clearance declarations before moving candidates forward.
            </p>
          </div>
          <div className='flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary'>
            <ClipboardCheck className='h-4 w-4' />
            {response?.count || 0} application{response?.count === 1 ? "" : "s"} to review
          </div>
        </div>
        <EligibilityReviewQueue initialApplications={applications} />
      </div>
    </>
  );
};

export default EligibilityReviewPage;
