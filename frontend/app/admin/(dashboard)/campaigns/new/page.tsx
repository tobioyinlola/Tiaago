import { redirect } from "next/navigation";

import { createCampaign } from "@/app/common/services/campaigns";

export const metadata = {
  title: "New Campaign",
};

// The builder is a single continuous page, not a wizard -- so "new" means
// "create an empty draft, then land on its edit page" rather than a
// separate creation flow with its own unsaved state to manage.
const NewCampaignPage = async () => {
  const result = await createCampaign({ name: "Untitled campaign" });
  if (!result.success) {
    return <div className="p-8 text-center text-sm text-[#9E9E9E]">Couldn&apos;t start a new campaign: {result.error}</div>;
  }
  redirect(`/admin/campaigns/${result.data.id}/edit`);
};

export default NewCampaignPage;
