import CampaignWizard from "../_components/CampaignWizard";

export const metadata = {
  title: "New Campaign",
};

const NewCampaignPage = () => {
  return (
    <>
      <div className="border-b w-full border-border pb-1 mb-6">
        <h1 className="text-2xl font-bold mb-1 font-space-grotesk">New Campaign</h1>
        <h4 className="text-foreground text-sm md:text-base">Build and send a targeted email campaign.</h4>
      </div>
      <CampaignWizard initialCampaign={null} />
    </>
  );
};

export default NewCampaignPage;
