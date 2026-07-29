import { getTalentRoles } from "@/app/common/services";
import CreateAssessmentForm from "./CreateAssessmentForm";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import { getCompanyAssessment } from "@/app/common/services/assessment";
import { ISearchParams } from "@/app/common/types";

export const metadata = {
  title: "Add Assessment",
};

const AddAssessmentPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  // ?assessmentId=<id> resumes a draft the recruiter abandoned mid-wizard:
  // the GeneralSkillAssessment row already exists (it's created on step
  // 0 -> 1), so the wizard skips the create-POST and starts pre-filled.
  const resumeId = Array.isArray(resolvedSearchParams.assessmentId)
    ? resolvedSearchParams.assessmentId[0]
    : resolvedSearchParams.assessmentId;

  const [talentRoles, existingAssessment] = await Promise.all([
    getTalentRoles().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get talent roles error (add assessment): ", error);
      errors.push({
        message: error,
        title: "Error getting talent roles",
      });
      return [];
    }),
    resumeId
      ? getCompanyAssessment(resumeId).catch(async e => {
          const error = await handleServerApiCallError(e);
          console.log("Get draft assessment error (resume assessment): ", error);
          errors.push({
            message: error,
            title: "Error loading the draft assessment -- starting a new one instead",
          });
          return null;
        })
      : Promise.resolve(null),
  ]);

  // Published assessments are read-only -- the API refuses section edits on
  // them, so never drop the recruiter into an editing wizard for one.
  const resumableAssessment = existingAssessment?.published ? null : existingAssessment;

  return (
    <div className='text-black'>
      <DisplayErrorMessages errors={errors} />
      <h1 className='text-2xl font-medium font-space-grotesk text-primaryBlack mb-6'>
        {resumableAssessment ? "Continue Assessment" : "Add Assessment"}
      </h1>

      <CreateAssessmentForm
        talentRoles={talentRoles}
        existingAssessment={resumableAssessment}
      />
    </div>
  );
};

export default AddAssessmentPage;
