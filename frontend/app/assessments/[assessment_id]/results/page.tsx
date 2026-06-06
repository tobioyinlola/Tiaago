import { notFound } from "next/navigation";

import {
  getCompanyAssessment,
  getAssessmentResultsList,
} from "@/app/common/services/assessment";
import { handleServerApiCallError } from "@/app/common/utils";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import AssessmentResults from "../../_components/AssessmentResults";

export const metadata = {
  title: "Assessment Results",
};

const AssessmentResultsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ assessment_id: string }>;
  searchParams: Promise<{ tab: string }>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { assessment_id } = await params;
  const { tab } = await searchParams;
  const assessment = await getCompanyAssessment(assessment_id).catch(
    async e => {
      const error = await handleServerApiCallError(e);
      console.log(
        "Get company assessment error (assessment results page): ",
        error
      );
      errors.push({
        message: error,
        title: "Error getting assessment",
      });
      return null;
    }
  );
  if (!assessment) return notFound();

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <AssessmentResults
        assessment={assessment}
        mode='talent-verification'
        tab={tab === "coding_task" ? "coding_task" : "mcq"}
      />
    </>
  );
};

export default AssessmentResultsPage;
