import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getSegments } from "@/app/common/services/segments";
import { handleServerApiCallError } from "@/app/common/utils";
import SegmentsBuilder from "./_components/SegmentsBuilder";

export const metadata = {
  title: "Segments",
};

const AdminSegmentsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const segments = await getSegments().catch(async e => {
    errors.push({ title: "Error loading segments", message: await handleServerApiCallError(e) });
    return [];
  });

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className="border-b w-full border-border pb-1 mb-6">
        <h1 className="text-2xl font-bold mb-1 font-space-grotesk">Segments</h1>
        <h4 className="text-foreground text-sm md:text-base">
          Build audience segments from tags and organisation properties, for campaigns and notifications.
        </h4>
      </div>

      <SegmentsBuilder initialSegments={segments} />
    </>
  );
};

export default AdminSegmentsPage;
