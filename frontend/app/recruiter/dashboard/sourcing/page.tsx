import { getAllTalents } from "@/app/common/services/profile";
import Sourcing from "./_components/Sourcing";
import { handleServerApiCallError } from "@/app/common/utils";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getTalentRoles } from "@/app/common/services";
import { ISearchParams } from "@/app/common/types";

export const metadata = {
  title: "Sourcing",
};

const SourcingPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1;
  const search =
    typeof resolvedSearchParams.search === "string"
      ? resolvedSearchParams.search
      : undefined;
  const role =
    typeof resolvedSearchParams.role === "string"
      ? resolvedSearchParams.role
      : undefined;
  const experienceLevel =
    typeof resolvedSearchParams.experience_level === "string"
      ? resolvedSearchParams.experience_level
      : undefined;

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
    getAllTalents(page, undefined, search, role, experienceLevel).catch(async (e: any) => {
      const error = await handleServerApiCallError(e);
      console.log("Get talents error (sourcing): ", error);
      errors.push({
        message: error,
        title: "Error getting talents",
      });
      return null;
    }),
  ]);
  return (
    <>
      <Sourcing
        talentsRes={talentsRes}
        roles={roles}
        searchParams={resolvedSearchParams}
      />
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default SourcingPage;
