import DisplayErrorMessages, { DisplayErrorMessagesProps } from "@/app/common/components/DisplayErrorMessages";
import { getReadinessQueue } from "@/app/common/services/jobs";
import ReadinessQueue from "./_components/ReadinessQueue";

export const metadata = { title: "Readiness" };

const ReadinessPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const response = await getReadinessQueue().catch(error => {
    errors.push({ title: "Could not load readiness", message: error.message });
    return null;
  });
  return <><DisplayErrorMessages errors={errors} /><div className='dashboard-content-constraint flex flex-col gap-6 p-8 max-md:px-1 sm:gap-8'><div><h1 className='font-space-grotesk text-2xl font-semibold'>Readiness</h1><p className='mt-1 text-secondary-black'>Track accepted offers through outstanding checks, ready-to-start, and confirmed start. An accepted offer is not a completed start.</p></div><ReadinessQueue initialApplications={response?.results || []} /></div></>;
};

export default ReadinessPage;
