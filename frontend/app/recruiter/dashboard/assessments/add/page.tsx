import { ISearchParams } from "@/app/common/types";
import { getTalentRoles } from "@/app/common/services";
import AddAssessmentForm from "../_components/AddAssessmentForm";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

type Props = {
  searchParams: Promise<ISearchParams>;
};

export const metadata = {
  title: "Add Assessment",
};

const AddAssessmentPage = async ({ searchParams }: Props) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const questionType =
    typeof resolvedSearchParams.type === "string"
      ? resolvedSearchParams.type
      : resolvedSearchParams.type?.at(0);
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

      <AddAssessmentForm
        questionType={questionType}
        talentRoles={talentRoles}
      />
    </div>
  );
};

export default AddAssessmentPage;
