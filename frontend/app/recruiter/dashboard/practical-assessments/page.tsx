import DisplayErrorMessages, { DisplayErrorMessagesProps } from "@/app/common/components/DisplayErrorMessages";
import { getPracticalAssessmentReviewQueue } from "@/app/common/services/jobs";
import PracticalAssessmentReviewQueue from "./_components/PracticalAssessmentReviewQueue";

export const metadata = { title: "Practical assessments" };

const PracticalAssessmentsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const response = await getPracticalAssessmentReviewQueue().catch(error => {
    errors.push({ title: "Could not load practical assessments", message: error.message });
    return null;
  });
  return <><DisplayErrorMessages errors={errors} /><div className='dashboard-content-constraint flex flex-col gap-6 p-8 max-md:px-1 sm:gap-8'><div><h1 className='font-space-grotesk text-2xl font-semibold'>Practical assessments</h1><p className='mt-1 text-secondary-black'>Record observed field or operational assessments. Critical failures always result in a fail.</p></div><PracticalAssessmentReviewQueue initialApplications={response?.results || []} /></div></>;
};

export default PracticalAssessmentsPage;
