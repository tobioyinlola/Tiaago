import { notFound } from "next/navigation";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { CodingTaskSection } from "@/app/common/types";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCompanyAssessment } from "@/app/common/services/assessment";
import AssessmentCodingTask from "../../_components/AssessmentCodingTask";

export const metadata = {
  title: "Assessment Coding Task",
};

const AssessmentCodingTaskPage = async ({
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
        "Get company assessment error (assessment coding task page): ",
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
  
  const codeSection = assessment.sections.find(
    section => section.type === "CODING_TASK"
  );
  if (!codeSection) notFound();
  
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <AssessmentCodingTask
        assessment={assessment}
        codeSection={codeSection as CodingTaskSection}
        mode="talent-verification"
      />
    </>
  );
};

export default AssessmentCodingTaskPage;
