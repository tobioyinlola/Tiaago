import { handleServerApiCallError } from "@/app/common/utils";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getCategories, getPipeline } from "@/app/common/services/sourcing";
import Pipeline from "../_components/Pipeline";

export const metadata = {
  title: "Pipeline",
};

const PipelineDetailPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const isAll = id === "all";

  const categoryId = isAll ? undefined : id;

  const pipeline = await getPipeline(categoryId).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get pipeline error (pipeline detail): ", error);
    errors.push({
      message: error,
      title: "Error getting pipeline entries",
    });
    return null;
  });

  let categoryName = "All Candidates";
  if (!isAll) {
    const categories = await getCategories().catch(() => []);
    const category = categories.find(c => String(c.id) === id);
    if (category) categoryName = category.name;
  }

  return (
    <>
      <Pipeline
        pipeline={pipeline}
        categoryName={categoryName}
        categoryId={categoryId}
      />
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default PipelineDetailPage;
