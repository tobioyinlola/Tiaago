import { notFound } from "next/navigation";

import {
  getCompanyAssessment,
  getCompanyAssessmentCooldownStatus,
  initiateAssessmentPayment,
} from "@/app/common/services/assessment";
import { IS_DEV } from "@/app/common/constants";
import { handleServerApiCallError } from "@/app/common/utils";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import AssessmentMCQQuiz from "../../_components/AssessmentMCQQuiz";
import { MCQSection } from "@/app/common/types";

export const metadata = {
  title: "Assessment MCQs",
};

const AssessmentMCQSectionPage = async ({
  params,
}: {
  params: Promise<{ assessment_id: string }>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { assessment_id } = await params;

  const assessment = await getCompanyAssessment(assessment_id).catch(
    async e => {
      const error = await handleServerApiCallError(e);
      console.log(
        "Get company assessment error (assessment mcq section page): ",
        error
      );
      errors.push({
        message: error,
        title: "Error getting assessment",
      });
      return null;
    }
  );
  if (!assessment) notFound();

  const mcqSection = assessment.sections.find(s => s.type === "MCQ");
  if (!mcqSection) notFound();

  const initiateAssessmentPaymentResponse = await initiateAssessmentPayment(
    assessment_id
  ).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Initiate assessment payment error (assessment mcq section page): ",
      error
    );
    if (error.includes("paid")) {
      return undefined;
    }
    errors.push({
      message: error,
      title: "Error initiating assessment payment",
    });
    return {
      success: true,
      data: { payment_url: `/assessments/${assessment_id}/mcq` },
    };
  });

  const paymentUrl = initiateAssessmentPaymentResponse?.success
    ? initiateAssessmentPaymentResponse.data?.payment_url
    : undefined;

  const coolDownStatus = await getCompanyAssessmentCooldownStatus(
    assessment_id
  ).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Get company assessment cooldown status error (assessment mcq section page): ",
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
      <AssessmentMCQQuiz
        mcqSection={mcqSection as MCQSection}
        assessment={assessment}
        checkoutUrl={paymentUrl}
        mode='talent-verification'
        daysLeftToTakeAssessment={coolDownStatus?.days_remaining}
      />
    </>
  );
};

export default AssessmentMCQSectionPage;
