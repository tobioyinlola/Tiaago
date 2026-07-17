import { getAllTalents } from "@/app/common/services/profile";
import Sourcing from "./_components/Sourcing";
import { handleServerApiCallError } from "@/app/common/utils";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getTalentRoles } from "@/app/common/services";

export const metadata = {
  title: "Sourcing",
};

const SourcingPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];

  const [roles, talentsRes] = await Promise.all([
    getTalentRoles().catch(async (e: any) => {
      const error = await handleServerApiCallError(e);
      console.log("Get talent roles error (sourcing): ", error);
      errors.push({
        message: error,
        title: "Error getting talent roles",
      });
      return [];
    }),
    getAllTalents().catch(async (e: any) => {
      const error = await handleServerApiCallError(e);
      console.log("Get talents error (sourcing): ", error);
      errors.push({
        message: error,
        title: "Error getting talents",
      });
      return null;
    }),
  ]);
  const talents = talentsRes?.results || [];
  return (
    <>
      <Sourcing talents={talents} roles={roles} />
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default SourcingPage;
