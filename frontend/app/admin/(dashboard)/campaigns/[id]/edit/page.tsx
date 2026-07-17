import { notFound } from "next/navigation";

import { getCampaign } from "@/app/common/services/campaigns";
import CampaignWizard from "../../_components/CampaignWizard";

export const metadata = {
  title: "Edit Campaign",
};

const EditCampaignPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const campaign = await getCampaign(id).catch(() => null);
  if (!campaign) return notFound();
  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        This campaign is {campaign.status.toLowerCase()} and can no longer be edited.
      </div>
    );
  }

  return (
    <>
      <div className="border-b w-full border-border pb-1 mb-6">
        <h1 className="text-2xl font-bold mb-1 font-space-grotesk">Edit Campaign</h1>
        <h4 className="text-foreground text-sm md:text-base">{campaign.name}</h4>
      </div>
      <CampaignWizard initialCampaign={campaign} />
    </>
  );
};

export default EditCampaignPage;
