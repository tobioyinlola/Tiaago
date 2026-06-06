import { handleServerApiCallError } from "@/app/common/utils";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getTalentRoles } from "@/app/common/services";
import Pipeline from "./_components/Pipeline";
import { getPipeline } from "@/app/common/services/sourcing";

export const metadata = {
  title: "Pipeline",
};

const PipelinePage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];

  //   const roles = await getTalentRoles().catch(async e => {
  //     const error = await handleServerApiCallError(e);
  //     console.log("Get talent roles error (pipeline): ", error);
  //     errors.push({
  //       message: error,
  //       title: "Error getting talent roles",
  //     });
  //     return [];
  //   });

  const pipeline = await getPipeline().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get pipeline error (pipeline): ", error);
    errors.push({
      message: error,
      title: "Error getting pipeline entries",
    });
    return null;
  });

  return (
    <>
      <Pipeline pipeline={pipeline} />
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default PipelinePage;
