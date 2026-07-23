import ConnectAtsPanel from "./_components/ConnectAtsPanel";
import { getAvailableAtsIntegrations } from "@/app/common/services/ats-server";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

export const metadata = {
  title: "Integrations",
};

const IntegrationsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const res = await getAvailableAtsIntegrations();
  if (!res.success) {
    errors.push({ title: "Error loading integrations", message: res.error });
  }
  const integrations = res.success ? res.data : [];

  return (
    <div className="text-black max-w-3xl">
      <DisplayErrorMessages errors={errors} />
      <h1 className="text-2xl font-semibold font-space-grotesk text-primaryBlack mb-1">Integrations</h1>
      <p className="text-secondary-black text-sm mb-6">
        Pull candidates and jobs in from the ATS you already use.
      </p>
      <ConnectAtsPanel integrations={integrations} />
    </div>
  );
};

export default IntegrationsPage;
