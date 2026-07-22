import { getTalentRoles } from "@/app/common/services";
import CreateAssessmentForm from "./CreateAssessmentForm";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Add Assessment",
};

const AddAssessmentPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const talentRoles = await getTalentRoles().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get talent roles error (add assessment): ", error);
    errors.push({
      message: error,
      title: "Error getting talent roles",
    });
    return [];
  });
  return (
    <div className='text-black'>
      <DisplayErrorMessages errors={errors} />
      <h1 className='text-2xl font-medium font-space-grotesk text-primaryBlack mb-6'>
        Add Assessment
      </h1>

      <CreateAssessmentForm talentRoles={talentRoles} />
    </div>
  );
};

export default AddAssessmentPage;
