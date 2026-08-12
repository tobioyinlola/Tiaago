import { notFound, redirect } from "next/navigation";

import { getCampaign } from "@/app/common/services/campaigns";
import CampaignBuilder from "../../_components/CampaignBuilder";

export const metadata = {
  title: "Campaign Builder",
};

const EditCampaignPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const campaign = await getCampaign(id).catch(() => null);
  if (!campaign) return notFound();
  // SENDING/SENT/CANCELLED campaigns have nothing left to edit -- the
  // report page is the useful destination for them. DRAFT/SCHEDULED/PAUSED
  // stay editable (PAUSED needs the builder for its Resume control too).
  if (["SENDING", "SENT", "CANCELLED"].includes(campaign.status)) {
    redirect(`/admin/campaigns/${id}/analytics`);
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-space-grotesk text-2xl font-bold text-[#1A3C5E]">Campaign Builder</h1>
      </div>
      <CampaignBuilder initialCampaign={campaign} />
    </>
  );
};

export default EditCampaignPage;
