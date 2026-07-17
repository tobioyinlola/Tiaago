import Link from "next/link";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getTemplates } from "@/app/common/services/campaigns";
import { handleServerApiCallError } from "@/app/common/utils";
import { CATEGORY_LABELS } from "@/app/common/types/campaigns.type";

export const metadata = {
  title: "Email Templates",
};

const AdminCampaignTemplatesPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const templates = await getTemplates().catch(async e => {
    errors.push({ title: "Error loading templates", message: await handleServerApiCallError(e) });
    return [];
  });

  const presets = templates.filter(t => t.is_preset);
  const custom = templates.filter(t => !t.is_preset);

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className="border-b w-full border-border pb-1 mb-6">
        <h1 className="text-2xl font-bold mb-1 font-space-grotesk">Email Templates</h1>
        <h4 className="text-foreground text-sm md:text-base">Pick a starting point for a campaign, or build one from scratch.</h4>
      </div>

      <Link
        href="/admin/campaigns/templates/new"
        className="block border-2 border-dashed rounded-lg p-6 text-center mb-8 hover:bg-gray-50"
      >
        <span className="font-semibold text-primary">+ Build from scratch</span>
      </Link>

      {presets.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Presets</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {presets.map(t => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </>
      )}

      <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Your templates</h3>
      {custom.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {custom.map(t => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No custom templates yet.</p>
      )}
    </>
  );
};

const TemplateCard = ({ template }: { template: { id: string; name: string; category: keyof typeof CATEGORY_LABELS; subject_line: string } }) => (
  <Link href={`/admin/campaigns/templates/${template.id}`} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow block">
    <div className="h-32 bg-gradient-to-br from-[#1A3C5E] to-[#2D5580] flex items-center justify-center text-white text-xs font-medium px-4 text-center">
      {template.subject_line}
    </div>
    <div className="p-3">
      <div className="font-medium text-sm">{template.name}</div>
      <span className="badge badge-sm badge-ghost mt-1">{CATEGORY_LABELS[template.category]}</span>
    </div>
  </Link>
);

export default AdminCampaignTemplatesPage;
