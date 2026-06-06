import { notFound } from "next/navigation";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import {
  getCompanyAssessment,
  getCompanyAssessmentCooldownStatus,
  initiateAssessmentPayment,
} from "@/app/common/services/assessment";

import { handleServerApiCallError } from "@/app/common/utils";
import AssessmentDetails from "@/app/common/components/AssessmentDetails";

export const metadata = {
  title: "Assessment",
};

const AssessmentViewPage = async ({
  params,
}: {
  params: Promise<{ assessment_id: string }>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { assessment_id } = await params;

  const assessment = await getCompanyAssessment(assessment_id).catch(
    async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get company assessment error (assessment view): ", error);
      errors.push({
        message: error,
        title: "Error getting assessment",
      });
      return null;
    }
  );
  if (!assessment) notFound();

  const initiateAssessmentPaymentResponse = await initiateAssessmentPayment(
    assessment_id
  ).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Initiate assessment payment error (assessment view): ", error);
    if (error.includes("paid")) {
      return undefined;
    }
    errors.push({
      message: error,
      title: "Error initiating assessment payment",
    });
    return {
      success: true,
      data: { payment_url: `/talents/assessments/${assessment_id}/` },
    };
  });

  const coolDownStatus = await getCompanyAssessmentCooldownStatus(
    assessment_id
  ).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Get company assessment cooldown status error (assessment view): ",
      error
    );
    errors.push({
      message: error,
      title: "Error getting assessment cooldown status",
    });
    return null;
  });

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-[#E6E6E6] pb-1 mb-8'>
        <h1 className='text-2xl font-semibold mb-1 font-switzer text-primary-black'>
          Assessment
        </h1>
        <p className='text-[#636568] text-base'>
          Discover your skill level and receive customized job postings
        </p>
      </div>

      <AssessmentDetails
        assessmentId={assessment_id}
        jobId=''
        mode='talent-verification'
        initiateAssessmentPaymentResponse={initiateAssessmentPaymentResponse}
        daysLeftToTakeAssessment={coolDownStatus?.days_remaining}
      />
    </>
  );
};

export default AssessmentViewPage;
