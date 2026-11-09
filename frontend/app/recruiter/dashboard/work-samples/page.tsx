import DisplayErrorMessages, { DisplayErrorMessagesProps } from "@/app/common/components/DisplayErrorMessages";
import { getWorkSampleReviewQueue } from "@/app/common/services/jobs";
import WorkSampleReviewQueue from "./_components/WorkSampleReviewQueue";

export const metadata = { title: "Work sample reviews" };

const WorkSampleReviewsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const response = await getWorkSampleReviewQueue().catch(error => {
    errors.push({ title: "Could not load work samples", message: error.message });
    return null;
  });
  return <><DisplayErrorMessages errors={errors} /><div className='dashboard-content-constraint flex flex-col gap-6 p-8 max-md:px-1 sm:gap-8'><div><h1 className='font-space-grotesk text-2xl font-semibold'>Work sample reviews</h1><p className='mt-1 text-secondary-black'>Review private role-relevant submissions before candidates move forward.</p></div><WorkSampleReviewQueue initialApplications={response?.results || []} /></div></>;
};

export default WorkSampleReviewsPage;
