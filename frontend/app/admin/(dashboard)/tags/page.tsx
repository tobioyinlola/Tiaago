import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getCustomTags, getSystemTags } from "@/app/common/services/tags";
import { handleServerApiCallError } from "@/app/common/utils";
import TagsTabs from "./_components/TagsTabs";
import SystemTagsTable from "./_components/SystemTagsTable";
import CustomTagsPanel from "./_components/CustomTagsPanel";

export const metadata = {
  title: "Tags",
};

const AdminTagsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams.tab === "custom" ? "custom" : "system";

  const systemTagsRes =
    tab === "system"
      ? await getSystemTags().catch(async e => {
          errors.push({ title: "Error loading system tags", message: await handleServerApiCallError(e) });
          return null;
        })
      : null;

  const customTags =
    tab === "custom"
      ? await getCustomTags().catch(async e => {
          errors.push({ title: "Error loading custom tags", message: await handleServerApiCallError(e) });
          return [];
        })
      : [];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className="border-b w-full border-border pb-1 mb-6">
        <h1 className="text-2xl font-bold mb-1 font-space-grotesk">Tags</h1>
        <h4 className="text-foreground text-sm md:text-base">
          System tags are applied and removed automatically by the hourly rule engine. Custom tags are applied
          manually.
        </h4>
      </div>

      <TagsTabs active={tab} />

      {tab === "system" ? (
        <SystemTagsTable tags={systemTagsRes?.results ?? []} lastRuleRun={systemTagsRes?.last_rule_run ?? null} />
      ) : (
        <CustomTagsPanel tags={customTags} />
      )}
    </>
  );
};

export default AdminTagsPage;
