import { handleServerApiCallError } from "@/app/common/utils";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getCategories, getPipeline } from "@/app/common/services/sourcing";
import PipelineCategories from "./_components/PipelineCategories";

export const metadata = {
  title: "Pipeline",
};

const PipelinePage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];

  const [categories, pipeline] = await Promise.all([
    getCategories().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get categories error (pipeline): ", error);
      errors.push({
        message: error,
        title: "Error getting pipeline categories",
      });
      return [];
    }),
    getPipeline().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get pipeline error (pipeline): ", error);
      errors.push({
        message: error,
        title: "Error getting pipeline entries",
      });
      return null;
    }),
  ]);

  return (
    <>
      <PipelineCategories
        categories={categories}
        totalCandidates={pipeline?.total_in_pipeline ?? 0}
      />
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default PipelinePage;
