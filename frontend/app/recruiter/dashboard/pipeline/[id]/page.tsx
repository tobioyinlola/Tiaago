import { handleServerApiCallError } from "@/app/common/utils";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getCategories, getPipeline } from "@/app/common/services/sourcing";
import { ISearchParams } from "@/app/common/types";
import Pipeline from "../_components/Pipeline";

export const metadata = {
  title: "Pipeline",
};

const PipelineDetailPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ISearchParams>;
}) => {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const isAll = id === "all";

  const categoryId = isAll ? undefined : id;
  const search = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : undefined;
  const status = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : undefined;
  const page = resolvedSearchParams.page ? Number(resolvedSearchParams.page) : undefined;

  const pipeline = await getPipeline(categoryId, { search, status, page }).catch(async e => {
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
        searchParams={resolvedSearchParams}
      />
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default PipelineDetailPage;
